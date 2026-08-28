import { useCallback, useEffect, useState } from 'react'
import { EVENTS_TABLE, supabase } from '../lib/supabase'

/**
 * Lado do painel: quem está em cada etapa agora.
 *
 * Lê os sinais de presença recentes e escuta `postgres_changes`, então
 * entrada, troca de etapa e saída chegam no mesmo instante. Cada sessão vale
 * pelo seu sinal mais recente: se for `presence_left`, saiu; se o último
 * sinal estiver velho demais, também sai (cobre queda de rede e aba morta).
 */

/** Sem sinal nesse tempo, a sessão é considerada fora. */
const VALIDADE_MS = 50000
/** Varre para expirar quem parou de sinalizar sem avisar. */
const VARREDURA_MS = 3000

type Sinal = {
  session_id: string
  event_name: string
  event_data: { step_id?: string; step_label?: string; traffic_source?: string }
  created_at: string
}

export type PresenceState = {
  countByStep: Record<string, number>
  sourcesByStep: Record<string, string[]>
  online: { session_id: string; step_id: string; step_label: string; traffic_source: string }[]
  total: number
}

const VAZIO: PresenceState = { countByStep: {}, sourcesByStep: {}, online: [], total: 0 }

export function usePresenceObserver(): PresenceState {
  const [state, setState] = useState<PresenceState>(VAZIO)

  const recalcular = useCallback(async () => {
    if (!supabase) return
    const desde = new Date(Date.now() - VALIDADE_MS).toISOString()
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('session_id, event_name, event_data, created_at')
      .in('event_name', ['presence_ping', 'presence_left'])
      .gte('created_at', desde)
      .order('created_at', { ascending: true })
    if (error || !data) return

    // O último sinal de cada sessão é o que vale.
    const ultimo = new Map<string, Sinal>()
    for (const s of data as Sinal[]) ultimo.set(s.session_id, s)

    const countByStep: Record<string, number> = {}
    const fontes: Record<string, Set<string>> = {}
    const online: PresenceState['online'] = []

    for (const [sessionId, s] of ultimo) {
      if (s.event_name === 'presence_left') continue
      const stepId = s.event_data?.step_id
      if (!stepId) continue
      countByStep[stepId] = (countByStep[stepId] ?? 0) + 1
      if (!fontes[stepId]) fontes[stepId] = new Set()
      const origem = s.event_data?.traffic_source ?? 'organico'
      fontes[stepId].add(origem)
      online.push({
        session_id: sessionId,
        step_id: stepId,
        step_label: s.event_data?.step_label ?? '—',
        traffic_source: origem,
      })
    }

    setState({
      countByStep,
      sourcesByStep: Object.fromEntries(Object.entries(fontes).map(([k, v]) => [k, [...v]])),
      online,
      total: online.length,
    })
  }, [])

  useEffect(() => {
    const cliente = supabase
    if (!cliente) return
    void recalcular()

    const canal = cliente
      .channel('presenca-painel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: EVENTS_TABLE }, () => void recalcular())
      .subscribe()

    const varredura = setInterval(() => void recalcular(), VARREDURA_MS)

    return () => {
      clearInterval(varredura)
      void cliente.removeChannel(canal)
    }
  }, [recalcular])

  return state
}
