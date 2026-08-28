import funnelData from '../funnel.json'
import { FunnelEngine } from '../engine'
import type { Funnel } from '../types'
import { EVENTS_TABLE, isSupabaseConfigured, supabase } from './supabase'

const funnel = (funnelData as any).funnel as Funnel
const engine = new FunnelEngine(funnel)

export type RawEvent = {
  id: string
  created_at: string
  session_id: string
  event_name: string
  event_data: Record<string, any>
  page_url: string | null
  user_agent: string | null
}

export type StepStat = {
  index: number
  id: string
  slug: string
  title: string
  viewed: number
  completed: number
  /** % das sessões que chegaram na etapa 1 e alcançaram esta. */
  reach: number
  /** % que viu esta etapa e não avançou. */
  dropOff: number
  answers: { label: string; count: number }[]
}

export type Purchase = {
  id: string
  created_at: string
  session_id: string | null
  status: string
  amount: number
  payment_method: string | null
  product_name: string | null
  buyer_name: string | null
  utm_source: string | null
  utm_campaign: string | null
}

export type BreakdownRow = {
  key: string
  label: string
  sublabel?: string
  sessions: number
  leads: number
  checkouts: number
  sales: number
  revenue: number
  /** sessões -> checkout */
  convRate: number
}

export type VariantRow = BreakdownRow & { completion: number }

export type AuditRow = {
  id: string
  created_at: string
  session_id: string
  event_name: string
  step_title: string
  variant: string
  duration_ms: number | null
  page_url: string | null
}

export type DeviceRow = { label: string; os: string; browser: string; count: number }

export type LiveSnapshot = {
  sessions: number
  stepsViewed: number
  checkouts: number
  conversion: number
  backredirects: number
  steps: StepStat[]
  campaigns: { source: string; campaign: string; sessions: number; checkouts: number }[]
  devices: DeviceRow[]
  campaignRows: BreakdownRow[]
  creativeRows: BreakdownRow[]
  variantRows: VariantRow[]
  audit: AuditRow[]
  timeline: { label: string; sessions: number; checkouts: number }[]
  recent: RawEvent[]
  demo: boolean

  // --- vendas (dependem do webhook do checkout) ---
  revenue: number
  sales: number
  ticket: number
  approvalRate: number
  gateway: { paid: number; pending: number; refused: number; total: number }
  purchases: Purchase[]

  // --- indicadores do funil ---
  leads: number
  icToSale: number
  interactionRate: number
  bounceStep1: number
  quizCompletion: number
  checkoutRate: number
  health: { score: number; quiz: number; checkout: number; approval: number }
  revenueProjection: number
  buyerProfile: { peakHour: string; topDevice: string; frontSales: number; frontTicket: number }
}

export const PERIODS = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  all: 'Tudo',
} as const
export type Period = keyof typeof PERIODS

function since(period: Period): Date | null {
  const now = new Date()
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === '7d') return new Date(now.getTime() - 7 * 864e5)
  if (period === '30d') return new Date(now.getTime() - 30 * 864e5)
  return null
}

/** Busca paginada — o Supabase corta em 1000 linhas por requisição. */
async function fetchAll(period: Period): Promise<RawEvent[]> {
  if (!supabase) return []
  const from = since(period)
  const rows: RawEvent[] = []
  const pageSize = 1000
  for (let page = 0; page < 50; page++) {
    let q = supabase
      .from(EVENTS_TABLE)
      .select('id, created_at, session_id, event_name, event_data, page_url, user_agent')
      // Os sinais de presença têm seu próprio fluxo, em tempo real.
      .not('event_name', 'in', '(presence_ping,presence_left)')
      .order('created_at', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1)
    if (from) q = q.gte('created_at', from.toISOString())
    const { data, error } = await q
    if (error) throw error
    rows.push(...((data ?? []) as RawEvent[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}

async function fetchPurchases(period: Period): Promise<Purchase[]> {
  if (!supabase) return []
  const from = since(period)
  let q = supabase
    .from('purchases')
    .select('id, created_at, session_id, status, amount, payment_method, product_name, buyer_name, utm_source, utm_campaign')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (from) q = q.gte('created_at', from.toISOString())
  const { data, error } = await q
  // A tabela pode ainda não existir enquanto o webhook não for instalado.
  if (error) return []
  return (data ?? []) as Purchase[]
}

function deviceOf(ua: string | null): string {
  if (!ua) return 'Desconhecido'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Macintosh|Mac OS/i.test(ua)) return 'macOS'
  return 'Outro'
}

/** Quebra o user agent em tipo de aparelho, sistema e navegador. */
function parseUA(ua: string | null): { device: string; os: string; browser: string } {
  if (!ua) return { device: 'Desconhecido', os: '—', browser: '—' }
  const mobile = /iPhone|iPod|Android.*Mobile/i.test(ua)
  const tablet = /iPad|Android(?!.*Mobile)/i.test(ua)
  const device = mobile ? 'Celular' : tablet ? 'Tablet' : 'Computador'

  let os = 'Outro'
  const iOS = ua.match(/OS (\d+)[._]/)
  if (/iPhone|iPad|iPod/i.test(ua)) os = `iOS${iOS ? ' ' + iOS[1] : ''}`
  else if (/Android/i.test(ua)) os = `Android${(ua.match(/Android (\d+)/) ?? [])[1] ? ' ' + ua.match(/Android (\d+)/)![1] : ''}`
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let browser = 'Outro'
  if (/Instagram/i.test(ua)) browser = 'Instagram'
  else if (/FBAN|FBAV/i.test(ua)) browser = 'Facebook'
  else if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) browser = 'TikTok'
  else if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/CriOS|Chrome/i.test(ua)) browser = 'Chrome'
  else if (/FxiOS|Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Safari/i.test(ua)) browser = 'Safari'

  return { device, os, browser }
}

/** Sinais operacionais de presença — não entram em nenhuma métrica. */
const EVENTOS_DE_PRESENCA = new Set(['presence_ping', 'presence_left'])

export function aggregate(todosEventos: RawEvent[], purchases: Purchase[] = [], demo = false): LiveSnapshot {
  const events = todosEventos.filter((e) => !EVENTOS_DE_PRESENCA.has(e.event_name))
  const path = engine.mainPath().filter((n) => n.type === 'page')

  const viewedBy = new Map<string, Set<string>>()
  const completedBy = new Map<string, Set<string>>()
  const answersBy = new Map<string, Map<string, number>>()
  const sessions = new Set<string>()
  const checkoutSessions = new Set<string>()
  const backredirects = new Set<string>()
  const campaigns = new Map<string, { source: string; campaign: string; s: Set<string>; c: Set<string> }>()
  const devices = new Map<string, Set<string>>()
  const byDay = new Map<string, { s: Set<string>; c: Set<string> }>()

  const add = (m: Map<string, Set<string>>, k: string, v: string) => {
    if (!m.has(k)) m.set(k, new Set())
    m.get(k)!.add(v)
  }

  for (const e of events) {
    sessions.add(e.session_id)
    const stepId = e.event_data?.step_id as string | undefined

    if (e.event_name === 'step_viewed' && stepId) add(viewedBy, stepId, e.session_id)
    if (e.event_name === 'step_completed' && stepId) add(completedBy, stepId, e.session_id)
    if (e.event_name === 'checkout_click') checkoutSessions.add(e.session_id)
    if (e.event_name === 'backredirect_fired') backredirects.add(e.session_id)

    if (e.event_name === 'quiz_answered' && stepId) {
      const label = String(e.event_data?.answer ?? '').trim()
      if (label) {
        if (!answersBy.has(stepId)) answersBy.set(stepId, new Map())
        const m = answersBy.get(stepId)!
        m.set(label, (m.get(label) ?? 0) + 1)
      }
    }

    const source = e.event_data?.utm_source || '(direto)'
    const campaign = e.event_data?.utm_campaign || '(sem campanha)'
    const key = `${source}||${campaign}`
    if (!campaigns.has(key)) campaigns.set(key, { source, campaign, s: new Set(), c: new Set() })
    const camp = campaigns.get(key)!
    camp.s.add(e.session_id)
    if (e.event_name === 'checkout_click') camp.c.add(e.session_id)

    add(devices, deviceOf(e.user_agent), e.session_id)

    const day = e.created_at.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, { s: new Set(), c: new Set() })
    byDay.get(day)!.s.add(e.session_id)
    if (e.event_name === 'checkout_click') byDay.get(day)!.c.add(e.session_id)
  }

  const firstStepReach = viewedBy.get(path[0]?.id)?.size ?? sessions.size ?? 0

  const steps: StepStat[] = path.map((node, i) => {
    const viewed = viewedBy.get(node.id)?.size ?? 0
    const completed = completedBy.get(node.id)?.size ?? 0
    const answers = [...(answersBy.get(node.id) ?? new Map())]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
    return {
      index: i + 1,
      id: node.id,
      slug: node.data.slug ?? '',
      title: node.data.title ?? '',
      viewed,
      completed,
      reach: firstStepReach ? (viewed / firstStepReach) * 100 : 0,
      dropOff: viewed ? ((viewed - completed) / viewed) * 100 : 0,
      answers,
    }
  })

  // ---- atribuição: liga cada sessão à sua origem e à sua variante ----
  // Percorre do evento mais antigo ao mais novo, então o primeiro toque
  // (o que traz os UTMs do anúncio) é o que fica valendo para a sessão.
  const sessionOrigin = new Map<string, { source: string; campaign: string; content: string; term: string; variant: string; variantLabel: string }>()
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    const d = e.event_data ?? {}
    const current = sessionOrigin.get(e.session_id)
    sessionOrigin.set(e.session_id, {
      source: current?.source || d.utm_source || '(direto)',
      campaign: current?.campaign || d.utm_campaign || '(sem campanha)',
      content: current?.content || d.utm_content || '(sem criativo)',
      term: current?.term || d.utm_term || '',
      variant: current?.variant || d.variant_id || '—',
      variantLabel: current?.variantLabel || d.variant_label || '—',
    })
  }

  const leadStepId = path.find((n) => (n.data.title ?? '').includes('IA LIBERADA'))?.id
  const leadSessions = new Set(leadStepId ? [...(viewedBy.get(leadStepId) ?? [])] : [])

  // Receita por sessão, para atribuir venda à campanha/criativo/variante.
  const revenueBySession = new Map<string, number>()
  const salesBySession = new Map<string, number>()
  for (const p of purchases) {
    if (p.status !== 'paid' || !p.session_id) continue
    revenueBySession.set(p.session_id, (revenueBySession.get(p.session_id) ?? 0) + Number(p.amount || 0))
    salesBySession.set(p.session_id, (salesBySession.get(p.session_id) ?? 0) + 1)
  }

  /** Agrupa as sessões por uma dimensão e calcula o funil inteiro dela. */
  function breakdown(keyOf: (o: NonNullable<ReturnType<typeof sessionOrigin.get>>) => { key: string; label: string; sublabel?: string }) {
    const acc = new Map<string, BreakdownRow>()
    for (const [sessionId, origin] of sessionOrigin) {
      const { key, label, sublabel } = keyOf(origin)
      if (!acc.has(key)) {
        acc.set(key, { key, label, sublabel, sessions: 0, leads: 0, checkouts: 0, sales: 0, revenue: 0, convRate: 0 })
      }
      const row = acc.get(key)!
      row.sessions++
      if (leadSessions.has(sessionId)) row.leads++
      if (checkoutSessions.has(sessionId)) row.checkouts++
      row.sales += salesBySession.get(sessionId) ?? 0
      row.revenue += revenueBySession.get(sessionId) ?? 0
    }
    return [...acc.values()]
      .map((r) => ({ ...r, convRate: r.sessions ? (r.checkouts / r.sessions) * 100 : 0 }))
      .sort((a, b) => b.sessions - a.sessions)
  }

  const campaignRows = breakdown((o) => ({ key: `${o.source}||${o.campaign}`, label: o.campaign, sublabel: o.source }))
  const creativeRows = breakdown((o) => ({ key: `${o.content}||${o.term}`, label: o.content, sublabel: o.term || undefined }))
  const variantRows: VariantRow[] = breakdown((o) => ({ key: o.variant, label: o.variantLabel, sublabel: `variante ${o.variant}` }))
    .map((r) => ({ ...r, completion: r.sessions ? (r.leads / r.sessions) * 100 : 0 }))

  // ---- dispositivos detalhados ----
  const deviceAcc = new Map<string, DeviceRow & { sessions: Set<string> }>()
  for (const e of events) {
    const { device, os, browser } = parseUA(e.user_agent)
    const key = `${device}|${os}|${browser}`
    if (!deviceAcc.has(key)) deviceAcc.set(key, { label: device, os, browser, count: 0, sessions: new Set() })
    deviceAcc.get(key)!.sessions.add(e.session_id)
  }
  const deviceRows: DeviceRow[] = [...deviceAcc.values()]
    .map((d) => ({ label: d.label, os: d.os, browser: d.browser, count: d.sessions.size }))
    .sort((a, b) => b.count - a.count)

  // ---- auditoria: trilha crua dos eventos ----
  const audit: AuditRow[] = events.slice(0, 400).map((e) => ({
    id: e.id,
    created_at: e.created_at,
    session_id: e.session_id,
    event_name: e.event_name,
    step_title: String(e.event_data?.step_title ?? '—'),
    variant: String(e.event_data?.variant_id ?? '—'),
    duration_ms: typeof e.event_data?.duration_ms === 'number' ? e.event_data.duration_ms : null,
    page_url: e.page_url,
  }))

  // ---- vendas ----
  const paid = purchases.filter((p) => p.status === 'paid')
  const revenue = paid.reduce((s, p) => s + Number(p.amount || 0), 0)
  const gateway = {
    paid: paid.length,
    pending: purchases.filter((p) => p.status === 'pending').length,
    refused: purchases.filter((p) => p.status === 'refused').length,
    total: purchases.length,
  }
  const decided = gateway.paid + gateway.refused
  const approvalRate = decided ? (gateway.paid / decided) * 100 : 0

  // ---- indicadores do funil ----
  const lastStep = path[path.length - 1]
  const firstStep = path[0]
  const reachedFirst = viewedBy.get(firstStep?.id)?.size ?? 0
  const reachedLast = viewedBy.get(lastStep?.id)?.size ?? 0

  // Lead = quem terminou o quiz e chegou na liberação da IA.
  const leadStep = path.find((n) => (n.data.title ?? '').includes('IA LIBERADA'))
  const leads = leadStep ? (viewedBy.get(leadStep.id)?.size ?? 0) : reachedLast

  // Bounce = viu a primeira etapa e nenhuma outra.
  const stepsPerSession = new Map<string, Set<string>>()
  for (const e of events) {
    if (e.event_name !== 'step_viewed') continue
    const id = e.event_data?.step_id as string | undefined
    if (!id) continue
    if (!stepsPerSession.has(e.session_id)) stepsPerSession.set(e.session_id, new Set())
    stepsPerSession.get(e.session_id)!.add(id)
  }
  const onlyOne = [...stepsPerSession.values()].filter((s) => s.size <= 1).length
  const interacted = [...stepsPerSession.values()].filter((s) => s.size > 1).length
  const totalWithSteps = stepsPerSession.size

  const hourCount = new Map<number, number>()
  for (const p of paid) {
    const h = new Date(p.created_at).getHours()
    hourCount.set(h, (hourCount.get(h) ?? 0) + 1)
  }
  const peak = [...hourCount.entries()].sort((a, b) => b[1] - a[1])[0]

  const devicesSorted = [...devices.entries()].map(([label, set]) => ({ label, count: set.size })).sort((a, b) => b.count - a.count)

  const quizCompletion = reachedFirst ? (leads / reachedFirst) * 100 : 0
  const checkoutRate = reachedLast ? (checkoutSessions.size / reachedLast) * 100 : 0
  const icToSale = checkoutSessions.size ? (gateway.paid / checkoutSessions.size) * 100 : 0

  // Nota de saúde: média ponderada dos três gargalos que importam.
  const health = {
    quiz: quizCompletion,
    checkout: checkoutRate,
    approval: approvalRate,
    score: Math.round(quizCompletion * 0.4 + checkoutRate * 0.35 + approvalRate * 0.25),
  }

  // Projeção do dia: extrapola o ritmo atual até as 24h.
  const now = new Date()
  const elapsed = (now.getHours() * 60 + now.getMinutes()) / (24 * 60)
  const revenueProjection = elapsed > 0.02 ? revenue / elapsed : revenue

  return {
    revenue,
    sales: gateway.paid,
    ticket: gateway.paid ? revenue / gateway.paid : 0,
    approvalRate,
    gateway,
    purchases,
    leads,
    icToSale,
    interactionRate: totalWithSteps ? (interacted / totalWithSteps) * 100 : 0,
    bounceStep1: totalWithSteps ? (onlyOne / totalWithSteps) * 100 : 0,
    quizCompletion,
    checkoutRate,
    health,
    revenueProjection,
    buyerProfile: {
      peakHour: peak ? `${String(peak[0]).padStart(2, '0')}:00` : '—',
      topDevice: devicesSorted[0]?.label ?? '—',
      frontSales: gateway.paid,
      frontTicket: gateway.paid ? revenue / gateway.paid : 0,
    },

    sessions: sessions.size,
    stepsViewed: events.filter((e) => e.event_name === 'step_viewed').length,
    checkouts: checkoutSessions.size,
    conversion: sessions.size ? (checkoutSessions.size / sessions.size) * 100 : 0,
    backredirects: backredirects.size,
    steps,
    campaigns: [...campaigns.values()]
      .map((c) => ({ source: c.source, campaign: c.campaign, sessions: c.s.size, checkouts: c.c.size }))
      .sort((a, b) => b.sessions - a.sessions),
    devices: deviceRows,
    campaignRows,
    creativeRows,
    variantRows,
    audit,
    timeline: [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ label: day.slice(5), sessions: v.s.size, checkouts: v.c.size })),
    recent: events.slice(0, 60),
    demo,
  }
}

export async function loadSnapshot(period: Period): Promise<LiveSnapshot> {
  if (!isSupabaseConfigured) return aggregate(buildDemoEvents(), buildDemoPurchases(), true)
  const [events, purchases] = await Promise.all([fetchAll(period), fetchPurchases(period)])
  return aggregate(events, purchases)
}

/** Vendas simuladas, só para o modo demonstração. */
function buildDemoPurchases(): Purchase[] {
  const out: Purchase[] = []
  let seed = 21
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const sources = ['facebook', 'tiktok', 'google']
  for (let i = 0; i < 34; i++) {
    const r = rand()
    const status = r < 0.72 ? 'paid' : r < 0.86 ? 'pending' : 'refused'
    out.push({
      id: `demo-p${i}`,
      created_at: new Date(Date.now() - Math.floor(rand() * 7) * 864e5 - Math.floor(rand() * 6e7)).toISOString(),
      session_id: `demo-${Math.floor(rand() * 120)}`,
      status,
      amount: [97, 197, 297][Math.floor(rand() * 3)],
      payment_method: rand() < 0.6 ? 'pix' : 'credit_card',
      product_name: 'IA PRO',
      buyer_name: null,
      utm_source: sources[Math.floor(rand() * sources.length)],
      utm_campaign: 'frio-01',
    })
  }
  return out
}

export { engine as liveEngine }

/**
 * Dados de demonstração — usados só enquanto o Supabase não está
 * configurado, para o painel poder ser avaliado com o funil real.
 * Simula queda progressiva de etapa em etapa.
 */
function buildDemoEvents(): RawEvent[] {
  const path = engine.mainPath().filter((n) => n.type === 'page')
  const events: RawEvent[] = []
  const sources = ['facebook', 'tiktok', 'google', '(direto)']
  const campaigns = ['frio-01', 'retargeting', 'lookalike-3']
  const creatives = ['video-lambo', 'print-pix', 'depoimento-01', 'carrossel-02']
  const variants = [
    { id: 'A', label: 'Hook V.1 Original' },
    { id: 'B', label: 'Hook V.2 GIF PIX' },
    { id: 'C', label: 'Hook 3 Vídeo' },
    { id: 'D', label: 'Hook 4 Vídeo' },
  ]
  // User agents reais, incluindo os navegadores embutidos de Instagram e
  // TikTok — é por onde a maior parte do tráfego pago chega.
  const uas = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 335.0.0.30.98',
    'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; moto g(60)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/468.0]',
  ]
  const total = 420
  let seed = 7
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

  for (let i = 0; i < total; i++) {
    const session = `demo-${i}`
    const ua = uas[Math.floor(rand() * uas.length)]
    const utm_source = sources[Math.floor(rand() * sources.length)]
    const utm_campaign = campaigns[Math.floor(rand() * campaigns.length)]
    const utm_content = creatives[Math.floor(rand() * creatives.length)]
    const variant = variants[Math.floor(rand() * variants.length)]
    const dayOffset = Math.floor(rand() * 7)
    const base = Date.now() - dayOffset * 864e5 - Math.floor(rand() * 6e6)
    // Cada etapa retém ~88% de quem chegou nela.
    let depth = 1
    while (depth < path.length && rand() < 0.88) depth++

    for (let s = 0; s < depth; s++) {
      const node = path[s]
      const meta = {
        step_id: node.id,
        step_slug: node.data.slug,
        step_title: node.data.title,
        step_index: s + 1,
        utm_source,
        utm_campaign,
        utm_content,
        variant_id: variant.id,
        variant_label: variant.label,
        duration_ms: 4000 + Math.floor(rand() * 40000),
      }
      events.push({
        id: `${session}-v${s}`,
        created_at: new Date(base + s * 40000).toISOString(),
        session_id: session,
        event_name: 'step_viewed',
        event_data: meta,
        page_url: '/',
        user_agent: ua,
      })
      if (s < depth - 1) {
        events.push({
          id: `${session}-c${s}`,
          created_at: new Date(base + s * 40000 + 20000).toISOString(),
          session_id: session,
          event_name: 'step_completed',
          event_data: meta,
          page_url: '/',
          user_agent: ua,
        })
      }
    }
    if (depth === path.length && rand() < 0.55) {
      events.push({
        id: `${session}-ck`,
        created_at: new Date(base + depth * 40000).toISOString(),
        session_id: session,
        event_name: 'checkout_click',
        event_data: { step_id: path[path.length - 1].id, utm_source, utm_campaign },
        page_url: '/',
        user_agent: ua,
      })
    }
  }
  return events.sort((a, b) => b.created_at.localeCompare(a.created_at))
}
