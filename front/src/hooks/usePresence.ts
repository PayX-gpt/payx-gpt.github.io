import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getTrackingData } from '../lib/tracking'

/**
 * Presença ao vivo por etapa.
 *
 * Publica num canal de Realtime Presence do Supabase em que etapa a sessão
 * está agora. O painel /live observa esse canal, então o lead aparece no
 * quadro da etapa no instante em que entra e some no instante em que sai —
 * é estado efêmero, nada disso vai para o banco.
 */

const PRESENCE_CHANNEL = 'funnel-presence'
const HEARTBEAT_MS = 15000

export type PresencePayload = {
  session_id: string
  step_id: string
  step_label: string
  traffic_source: string
  joined_at: string
}

type Channel = NonNullable<ReturnType<NonNullable<typeof supabase>['channel']>>

let sharedChannel: Channel | null = null
let subscribed = false
let pending: PresencePayload | null = null

function resetChannel() {
  sharedChannel = null
  subscribed = false
}

function detectTrafficSource(): string {
  try {
    const d = getTrackingData()
    const source = (d.utm_source ?? '').toLowerCase()
    if (d.ttclid || source.includes('tiktok')) return 'tiktok'
    if (d.fbclid || source.includes('facebook') || source.includes('instagram') || source.includes('meta')) return 'meta'
    if (d.gclid || source.includes('google')) return 'google'
    if (source) return source
  } catch {
    /* ignora */
  }
  return 'organico'
}

async function trackOn(channel: Channel, payload: PresencePayload) {
  try {
    await channel.track(payload)
  } catch {
    // Socket caiu: guarda e recria o canal na próxima tentativa.
    pending = payload
    resetChannel()
  }
}

function getChannel(sessionId: string): Channel | null {
  if (!supabase) return null
  if (sharedChannel) return sharedChannel

  sharedChannel = supabase.channel(PRESENCE_CHANNEL, {
    config: { presence: { key: sessionId } },
  })

  sharedChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      subscribed = true
      if (pending && sharedChannel) {
        void trackOn(sharedChannel, pending)
        pending = null
      }
      return
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      resetChannel()
    }
  })

  return sharedChannel
}

function publish(stepId: string, stepLabel: string) {
  if (!supabase) return
  // O próprio painel não deve aparecer como visitante do funil.
  if (window.location.pathname.toLowerCase().startsWith('/live')) return

  const sessionId = getTrackingData().session_id
  const payload: PresencePayload = {
    session_id: sessionId,
    step_id: stepId,
    step_label: stepLabel,
    traffic_source: detectTrafficSource(),
    joined_at: new Date().toISOString(),
  }

  const channel = getChannel(sessionId)
  if (!channel) return
  if (subscribed) void trackOn(channel, payload)
  else pending = payload
}

function leave() {
  if (!sharedChannel) return
  try {
    void sharedChannel.untrack()
  } catch {
    /* ignora */
  }
}

export function usePresence(stepId: string, stepLabel: string) {
  const lastStep = useRef<string | null>(null)

  useEffect(() => {
    if (!stepId || !supabase) return

    if (lastStep.current !== stepId) {
      lastStep.current = stepId
      publish(stepId, stepLabel)
    }

    // Mantém a presença viva nas etapas longas (vídeos de vários minutos)
    // e recupera depois de uma queda breve de socket.
    const heartbeat = setInterval(() => publish(stepId, stepLabel), HEARTBEAT_MS)

    // iOS/Safari congela WebSocket em aba oculta. Ao esconder, saímos na
    // hora (o painel reflete a saída em tempo real); ao voltar, re-anunciamos.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!subscribed) resetChannel()
        publish(stepId, stepLabel)
      } else {
        leave()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
    window.addEventListener('pagehide', leave)
    window.addEventListener('beforeunload', leave)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('beforeunload', leave)
    }
  }, [stepId, stepLabel])
}
