import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PresencePayload } from './usePresence'

/**
 * Lado do painel: observa o canal de presença e devolve quem está em cada
 * etapa agora. Entra no canal como observador (sem se anunciar), então o
 * próprio /live nunca é contado como visitante.
 */

export type PresenceState = {
  /** step_id -> quantidade de sessões naquela etapa neste instante. */
  countByStep: Record<string, number>
  /** step_id -> origens de tráfego presentes ali. */
  sourcesByStep: Record<string, string[]>
  online: PresencePayload[]
  total: number
}

const EMPTY: PresenceState = { countByStep: {}, sourcesByStep: {}, online: [], total: 0 }
const OBSERVER_KEY = 'painel-observador'

export function usePresenceObserver(): PresenceState {
  const [state, setState] = useState<PresenceState>(EMPTY)

  useEffect(() => {
    const client = supabase
    if (!client) return

    const channel = client.channel('funnel-presence', {
      config: { presence: { key: OBSERVER_KEY } },
    })

    const sync = () => {
      const raw = channel.presenceState<PresencePayload>()
      const countByStep: Record<string, number> = {}
      const sources: Record<string, Set<string>> = {}
      const online: PresencePayload[] = []

      for (const [key, entries] of Object.entries(raw)) {
        if (key === OBSERVER_KEY) continue
        if (!entries?.length) continue
        // Só o anúncio mais recente da sessão vale — é a etapa atual dela.
        const latest = entries[entries.length - 1]
        if (!latest?.step_id) continue
        online.push(latest)
        countByStep[latest.step_id] = (countByStep[latest.step_id] ?? 0) + 1
        if (!sources[latest.step_id]) sources[latest.step_id] = new Set()
        if (latest.traffic_source) sources[latest.step_id].add(latest.traffic_source)
      }

      setState({
        countByStep,
        sourcesByStep: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, [...v]])),
        online,
        total: online.length,
      })
    }

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') sync()
      })

    return () => {
      void client.removeChannel(channel)
    }
  }, [])

  return state
}
