/**
 * Teste A/B de hook (a primeira tela, que recebe o anúncio).
 *
 * O funil original guarda 4 variantes de hook, mas o nó de teste A/B está
 * desconectado — ou seja, nenhuma delas rodava. Aqui elas entram num rodízio
 * de verdade: a sessão sorteia uma variante na primeira visita, fica nela
 * pelo resto da navegação, e o painel compara o desempenho de cada uma.
 */

import { getWeights } from './config'

const STORAGE_KEY = 'xq_variant'

export type Variant = {
  id: string
  /** Nó do funil onde a sessão começa. */
  nodeId: string
  label: string
  /** Tipo de mídia do hook — o que de fato muda entre as variantes. */
  media: 'imagem' | 'video'
}

export const VARIANTS: Variant[] = [
  { id: 'A', nodeId: 'dfb3bf0a-aa44-4180-8a66-35b61f3b4948', label: 'Hook V.1 Original (foto)', media: 'imagem' },
  { id: 'B', nodeId: 'cb54ea05-7fe4-4913-a7f1-c382f8aad05d', label: 'Hook V.2 GIF PIX', media: 'imagem' },
  { id: 'C', nodeId: '01e5653d-a626-4d3c-8f02-5dfa13a76626', label: 'Hook 3 Vídeo', media: 'video' },
  { id: 'D', nodeId: 'cb5d6e87-a8e1-45d4-825f-9724cd7df7ee', label: 'Hook 4 Vídeo', media: 'video' },
]

/** Permite forçar uma variante para conferência: ?variant=C */
function forced(): Variant | null {
  const wanted = new URLSearchParams(window.location.search).get('variant')
  if (!wanted) return null
  return VARIANTS.find((v) => v.id.toLowerCase() === wanted.toLowerCase()) ?? null
}

function pickWeighted(): Variant {
  const weights = getWeights()
  const pool = VARIANTS.map((v) => ({ v, w: Math.max(0, weights[v.id] ?? 0) }))
  const total = pool.reduce((s, x) => s + x.w, 0)
  // Peso zero em tudo (ou config corrompida) volta para a variante original,
  // em vez de deixar o funil sem primeira tela.
  if (total <= 0) return VARIANTS[0]
  let roll = Math.random() * total
  for (const { v, w } of pool) {
    roll -= w
    if (roll <= 0) return v
  }
  return VARIANTS[0]
}

/**
 * Devolve a variante desta sessão, sorteando na primeira vez e guardando
 * depois — recarregar a página não troca o lead de variante, senão os
 * números do teste não fecham.
 */
export function getVariant(): Variant {
  const override = forced()
  if (override) return override
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    const found = VARIANTS.find((v) => v.id === saved)
    if (found) return found
  } catch {
    /* segue sem persistir */
  }
  const picked = pickWeighted()
  try {
    localStorage.setItem(STORAGE_KEY, picked.id)
  } catch {
    /* ignora */
  }
  return picked
}
