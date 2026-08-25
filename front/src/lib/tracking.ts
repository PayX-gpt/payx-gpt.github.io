/**
 * Camada de dados de rastreamento.
 *
 * Captura, na primeira visita, tudo que identifica a origem do lead
 * (UTMs, click ids de Meta/TikTok/Google e os parâmetros `src`/`sck` que o
 * funil original usa) e mantém isso pela sessão inteira — inclusive depois
 * de o lead navegar entre etapas, quando a URL já não traz mais os params.
 */

const SESSION_KEY = 'xq_session_id'
const TRACKING_KEY = 'xq_tracking'

/** Os mesmos nomes que o funil original declara como variáveis de sistema. */
export const UTM_KEYS = [
  'src',
  'sck',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

/** Identificadores de clique das plataformas de anúncio. */
export const CLICK_ID_KEYS = ['fbclid', 'ttclid', 'gclid'] as const

export type TrackingData = {
  session_id: string
  landing_url: string
  referrer: string
  started_at: string
} & Partial<Record<(typeof UTM_KEYS)[number] | (typeof CLICK_ID_KEYS)[number], string>>

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readStore(): Partial<TrackingData> {
  try {
    return JSON.parse(localStorage.getItem(TRACKING_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeStore(data: Partial<TrackingData>) {
  try {
    localStorage.setItem(TRACKING_KEY, JSON.stringify(data))
  } catch {
    /* modo privado / storage cheio: seguimos sem persistir */
  }
}

export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = uuid()
    sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return uuid()
  }
}

/**
 * Lê os parâmetros da URL atual e funde com o que já foi capturado antes.
 * O primeiro valor visto vence — se o lead entrou por um anúncio e depois
 * navegou para uma URL limpa, a origem original é preservada.
 */
export function initTracking(): TrackingData {
  const stored = readStore()
  const params = new URLSearchParams(window.location.search)
  const merged: Partial<TrackingData> = { ...stored }

  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const fromUrl = params.get(key)
    if (fromUrl && !merged[key]) merged[key] = fromUrl
  }
  if (!merged.landing_url) merged.landing_url = window.location.href
  if (!merged.referrer) merged.referrer = document.referrer || ''
  if (!merged.started_at) merged.started_at = new Date().toISOString()

  writeStore(merged)

  return { ...merged, session_id: getSessionId() } as TrackingData
}

export function getTrackingData(): TrackingData {
  return { ...readStore(), session_id: getSessionId() } as TrackingData
}

/**
 * Anexa os parâmetros de origem a uma URL de saída (checkout, backredirect),
 * sem sobrescrever o que o destino já traz. É isso que preserva a atribuição
 * de campanha quando o lead sai do funil para o checkout.
 */
export function withTrackingParams(url: string): string {
  try {
    const target = new URL(url)
    const data = getTrackingData()
    for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
      const value = data[key]
      if (value && !target.searchParams.has(key)) target.searchParams.set(key, value)
    }
    if (!target.searchParams.has('session_id')) {
      target.searchParams.set('session_id', data.session_id)
    }
    return target.toString()
  } catch {
    return url
  }
}
