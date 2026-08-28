import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getTrackingData } from '../lib/tracking'
import { trackEvent, trackEventReliable } from '../lib/metrics'

/**
 * Presença ao vivo por etapa.
 *
 * A sessão emite um sinal de vida com a etapa atual, e um sinal de saída
 * quando o lead fecha ou esconde a aba. O painel escuta esses eventos por
 * `postgres_changes`, então entrada, troca de etapa e saída aparecem no
 * mesmo instante.
 *
 * Usa a tabela de eventos que já existe em vez de uma tabela própria de
 * presença. É menos elegante — gera linhas operacionais no meio das
 * analíticas — mas não depende de criar schema, e o Realtime Presence do
 * supabase-js não estava registrando de forma confiável neste projeto.
 */

/** Intervalo do sinal de vida. Equilibra precisão e volume de linhas. */
const BATIDA_MS = 20000

function origemDoTrafego(): string {
  try {
    const d = getTrackingData()
    const fonte = (d.utm_source ?? '').toLowerCase()
    if (d.ttclid || fonte.includes('tiktok')) return 'tiktok'
    if (d.fbclid || fonte.includes('facebook') || fonte.includes('instagram') || fonte.includes('meta')) return 'meta'
    if (d.gclid || fonte.includes('google')) return 'google'
    if (fonte) return fonte
  } catch {
    /* ignora */
  }
  return 'organico'
}

export function usePresence(stepId: string, stepLabel: string) {
  const ultimaEtapa = useRef<string | null>(null)

  useEffect(() => {
    if (!stepId || !supabase) return
    // O próprio painel não deve aparecer como visitante do funil.
    if (window.location.pathname.toLowerCase().startsWith('/live')) return

    const dados = { step_id: stepId, step_label: stepLabel, traffic_source: origemDoTrafego() }
    const bater = () => void trackEvent('presence_ping', dados)

    if (ultimaEtapa.current !== stepId) {
      ultimaEtapa.current = stepId
      bater()
    }

    // Mantém o sinal nas etapas longas — os vídeos passam de 5 minutos.
    const batida = setInterval(bater, BATIDA_MS)

    // `keepalive`: a saída precisa chegar mesmo com a aba fechando, senão o
    // lead ficaria preso na etapa até o sinal expirar.
    const sair = () => trackEventReliable('presence_left', dados)

    const aoTrocarVisibilidade = () => {
      if (document.visibilityState === 'visible') bater()
      else sair()
    }

    document.addEventListener('visibilitychange', aoTrocarVisibilidade)
    window.addEventListener('pagehide', sair)
    window.addEventListener('beforeunload', sair)

    return () => {
      clearInterval(batida)
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade)
      window.removeEventListener('pagehide', sair)
      window.removeEventListener('beforeunload', sair)
    }
  }, [stepId, stepLabel])
}
