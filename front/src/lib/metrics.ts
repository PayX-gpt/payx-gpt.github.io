import { EVENTS_TABLE, isSupabaseConfigured, supabase } from './supabase'
import { CLICK_ID_KEYS, UTM_KEYS, getTrackingData } from './tracking'

export type EventName =
  | 'page_loaded'
  | 'step_viewed'
  | 'step_completed'
  | 'quiz_answered'
  | 'button_unlocked'
  | 'video_step_viewed'
  | 'carousel_slide_viewed'
  | 'loading_completed'
  | 'checkout_click'
  | 'backredirect_fired'
  // Sinais de presenca: dizem em que etapa a sessao esta agora. Sao
  // operacionais, nao analiticos — as agregacoes do painel os ignoram.
  | 'presence_ping'
  | 'presence_left'

type EventData = Record<string, unknown>

/** Junta ao evento tudo que identifica a origem do lead. */
function enrich(eventData: EventData) {
  const t = getTrackingData()
  const origin: EventData = {}
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) origin[key] = t[key] ?? null
  return {
    ...origin,
    referrer: t.referrer ?? null,
    landing_url: t.landing_url ?? null,
    ...eventData,
  }
}

function buildRow(eventName: EventName, eventData: EventData) {
  return {
    session_id: getTrackingData().session_id,
    event_name: eventName,
    event_data: enrich(eventData),
    page_url: window.location.href,
    user_agent: navigator.userAgent,
  }
}

/** Grava um evento. Nunca lança — tracking não pode derrubar o funil. */
export async function trackEvent(eventName: EventName, eventData: EventData = {}): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  try {
    await supabase.from(EVENTS_TABLE).insert([buildRow(eventName, eventData)])
  } catch (error) {
    console.warn('[metrics] falha ao gravar evento:', error)
  }
}

/**
 * Versão para eventos disparados logo antes de sair da página (checkout,
 * backredirect). Usa `keepalive`, então a requisição sobrevive à navegação —
 * um insert normal via SDK seria cancelado no meio.
 */
export function trackEventReliable(eventName: EventName, eventData: EventData = {}): void {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) return
  try {
    fetch(`${url}/rest/v1/${EVENTS_TABLE}`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify([buildRow(eventName, eventData)]),
    }).catch(() => {})
  } catch {
    /* ignora */
  }
}
