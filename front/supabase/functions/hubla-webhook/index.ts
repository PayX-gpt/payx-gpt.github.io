// Webhook do Hub.la -> tabela `purchases`.
//
// Deploy:   supabase functions deploy hubla-webhook --no-verify-jwt
// Segredo:  supabase secrets set HUBLA_WEBHOOK_TOKEN=<token>
//
// No Hub.la, aponte o webhook para:
//   https://<projeto>.supabase.co/functions/v1/hubla-webhook?token=<token>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_TOKEN = Deno.env.get('HUBLA_WEBHOOK_TOKEN') ?? ''

/** O Hub.la manda eventos como "sale.approved", "sale.refunded"... */
function statusFromEvent(event: string, fallback: unknown): string {
  const e = String(event ?? '').toLowerCase()
  if (e.includes('approved') || e.includes('paid')) return 'paid'
  if (e.includes('refund')) return 'refunded'
  if (e.includes('chargeback') || e.includes('dispute')) return 'chargeback'
  if (e.includes('canceled') || e.includes('cancelled')) return 'refused'
  if (e.includes('pending') || e.includes('waiting')) return 'pending'

  const s = String(fallback ?? '').toLowerCase()
  if (/paid|approved|aprovad|complete/.test(s)) return 'paid'
  if (/refund|estorn/.test(s)) return 'refunded'
  if (/chargeback/.test(s)) return 'chargeback'
  if (/cancel|refus|recus/.test(s)) return 'refused'
  return s || 'pending'
}

/** Valores chegam como 197, "197,00" ou 19700 (centavos). */
function toAmount(value: unknown): number {
  if (typeof value === 'number') return value > 10000 ? value / 100 : value
  const cleaned = String(value ?? '').replace(/[^\d,.-]/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/** Procura uma chave em qualquer profundidade do payload. */
function dig(obj: unknown, keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined
  const record = obj as Record<string, unknown>
  for (const key of keys) {
    const v = record[key]
    if (v !== undefined && v !== null && v !== '') return v
  }
  for (const value of Object.values(record)) {
    const found = dig(value, keys)
    if (found !== undefined) return found
  }
  return undefined
}

/** Lê um parâmetro de uma URL guardada no payload (ex.: a URL do checkout). */
function paramFromUrl(url: unknown, key: string): string | null {
  try {
    return new URL(String(url)).searchParams.get(key)
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (WEBHOOK_TOKEN) {
    const url = new URL(req.url)
    if (url.searchParams.get('token') !== WEBHOOK_TOKEN) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  const event = String(body.event ?? body.type ?? '')

  // A sessão é o que liga a venda ao lead que percorreu o funil. O link do
  // checkout carrega `gtl_sid`; se não vier, tentamos as variações.
  const checkoutUrl = dig(body, ['url', 'checkout_url', 'payment_url', 'first_payment_url'])
  const sessionId =
    (dig(body, ['gtl_sid', 'session_id', 'sck']) as string | undefined) ??
    paramFromUrl(checkoutUrl, 'gtl_sid') ??
    paramFromUrl(checkoutUrl, 'session_id') ??
    null

  const row = {
    session_id: sessionId ? String(sessionId) : null,
    transaction_id: String(dig(body, ['invoice_id', 'transaction_id', 'checkout_id', 'id']) ?? '') || null,
    status: statusFromEvent(event, dig(body, ['status', 'sale_status'])),
    amount: toAmount(dig(body, ['totalAmount', 'total_amount', 'amount', 'value', 'price'])),
    currency: String(dig(body, ['currency']) ?? 'BRL'),
    payment_method: String(dig(body, ['payment_method', 'paymentMethod', 'method']) ?? '') || null,
    product_name: String(dig(body, ['product_name', 'productName', 'offer_name', 'name']) ?? '') || null,
    buyer_name: String(dig(body, ['buyer_name', 'name', 'full_name']) ?? '') || null,
    buyer_email: String(dig(body, ['buyer_email', 'email']) ?? '') || null,
    utm_source: String(dig(body, ['utm_source']) ?? '') || null,
    utm_medium: String(dig(body, ['utm_medium']) ?? '') || null,
    utm_campaign: String(dig(body, ['utm_campaign']) ?? '') || null,
    utm_content: String(dig(body, ['utm_content']) ?? '') || null,
    utm_term: String(dig(body, ['utm_term']) ?? '') || null,
    raw: body,
  }

  // O Hub.la reenvia a mesma venda quando o status muda (aprovada, depois
  // estornada). `transaction_id` é único, então atualizamos em vez de duplicar.
  const { error } = await supabase
    .from('purchases')
    .upsert([row], { onConflict: 'transaction_id', ignoreDuplicates: false })

  if (error) {
    console.error('[hubla-webhook] falha ao gravar:', error, row)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`[hubla-webhook] ${event} -> ${row.status} | sessão: ${row.session_id ?? 'não identificada'}`)
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
