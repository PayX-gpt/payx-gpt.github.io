import { supabase } from './supabase'

/**
 * Configuração do funil editável pelo painel (hoje: pesos do teste A/B).
 *
 * O funil é a página que recebe o anúncio, então não pode esperar uma ida
 * ao banco antes de pintar a primeira tela. A estratégia é: ler do cache
 * local de forma síncrona, e atualizar o cache em segundo plano para a
 * próxima visita. Quem cai no funil na primeira vez usa os pesos padrão.
 */

const CACHE_KEY = 'xq_config'
const TABLE = 'funnel_config'
const KEY = 'variant_weights'

export type VariantWeights = Record<string, number>

// Padrão do funil publicado: todo o tráfego na V.1 (a foto).
// Os outros hooks só entram se você liberar pelo painel /live.
export const DEFAULT_WEIGHTS: VariantWeights = { A: 100, B: 0, C: 0, D: 0 }

function readCache(): VariantWeights | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeCache(weights: VariantWeights) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(weights))
  } catch {
    /* ignora */
  }
}

/** Leitura síncrona, usada no sorteio da variante. */
export function getWeights(): VariantWeights {
  return readCache() ?? DEFAULT_WEIGHTS
}

/** Busca no banco e atualiza o cache. Falha em silêncio. */
export async function refreshWeights(): Promise<VariantWeights> {
  if (!supabase) return getWeights()
  try {
    const { data, error } = await supabase.from(TABLE).select('value').eq('key', KEY).maybeSingle()
    if (error || !data?.value) return getWeights()
    const weights = data.value as VariantWeights
    writeCache(weights)
    return weights
  } catch {
    return getWeights()
  }
}

/** Grava os novos pesos. Usado pelo painel. */
export async function saveWeights(weights: VariantWeights): Promise<{ ok: boolean; error?: string }> {
  writeCache(weights)
  if (!supabase) {
    return { ok: false, error: 'Supabase não configurado — salvo apenas neste navegador.' }
  }
  try {
    const { error } = await supabase.from(TABLE).upsert([{ key: KEY, value: weights }], { onConflict: 'key' })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'falha ao salvar' }
  }
}
