// Webhook do checkout (Ticto) -> tabela `purchases`.
//
// Deploy:  supabase functions deploy ticto-webhook --no-verify-jwt
// Segredos: supabase secrets set TICTO_WEBHOOK_TOKEN=... SUPABASE_SERVICE_ROLE_KEY=...
//
// Depois é só apontar o webhook do Ticto para:
//   https://<projeto>.supabase.co/functions/v1/ticto-webhook?token=<TICTO_WEBHOOK_TOKEN>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_TOKEN = Deno.env.get('TICTO_WEBHOOK_TOKEN') ?? ''

/** Normaliza os vários nomes de status que o gateway pode mandar. */
function normalizeStatus(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase()
  if (/paid|approved|aprovad|complete|authorized/.test(s)) return 'paid'
  if (/refus|denied|declin|recus|fail/.test(s)) return 'refused'
  if (/refund|estorn|reembols/.test(s)) return 'refunded'
  if (/chargeback/.test(s)) return 'chargeback'
  if (/pending|waiting|aguard|pendent/.test(s)) return 'pending'
  return s || 'pending'
}

/** Valores podem vir como 199.90, "199,90" ou 19990 (centavos). */
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
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key]
  }
  for (const value of Object.values(record)) {
    const found = dig(value, keys)
    if (found !== undefined) return found
  }
  return undefined
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Token compartilhado na query string — o Ticto não assina o corpo.
  if (WEBHOOK_TOKEN) {
    const url = new URL(req.url)
    if (url.searchParams.get('token') !== WEBHOOK_TOKEN) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

  const row = {
    session_id: String(dig(payload, ['session_id', 'sessionId', 'sck']) ?? '') || null,
    transaction_id: String(dig(payload, ['transaction_code', 'transaction_id', 'order_id', 'id']) ?? '') || null,
    status: normalizeStatus(dig(payload, ['status', 'order_status', 'payment_status'])),
    amount: toAmount(dig(payload, ['amount', 'value', 'total', 'order_total', 'price'])),
    currency: String(dig(payload, ['currency']) ?? 'BRL'),
    payment_method: String(dig(payload, ['payment_method', 'method', 'payment_type']) ?? '') || null,
    product_name: String(dig(payload, ['product_name', 'product', 'offer_name']) ?? '') || null,
    buyer_name: String(dig(payload, ['customer_name', 'buyer_name', 'name']) ?? '') || null,
    buyer_email: String(dig(payload, ['customer_email', 'buyer_email', 'email']) ?? '') || null,
    utm_source: String(dig(payload, ['utm_source']) ?? '') || null,
    utm_medium: String(dig(payload, ['utm_medium']) ?? '') || null,
    utm_campaign: String(dig(payload, ['utm_campaign']) ?? '') || null,
    utm_content: String(dig(payload, ['utm_content']) ?? '') || null,
    utm_term: String(dig(payload, ['utm_term']) ?? '') || null,
    raw: payload,
  }

  // O gateway reenvia o mesmo evento quando o status muda; `transaction_id`
  // é único, então atualizamos em vez de duplicar a venda.
  const { error } = await supabase
    .from('purchases')
    .upsert([row], { onConflict: 'transaction_id', ignoreDuplicates: false })

  if (error) {
    console.error('[ticto-webhook] falha ao gravar:', error, row)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
