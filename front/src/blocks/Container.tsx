import type { Block } from '../types'

/**
 * Containers do funil são divs vazias (o espaçamento real vem do `gap`
 * do <main>). Reproduz a mesma marcação do original, sem altura própria.
 */
export function Container({ block }: { block: Block }) {
  const d = block.data
  return (
    <div
      id={block.id}
      className={`flex max-w-full flex-auto scroll-mt-7 text-pretty shadow-gray-600/5 gap-2 flex-col mx-auto fade-in rounded-xl w-full ${d.borderStyle === 'dashed' ? 'border-dashed' : 'border-solid'}`}
      style={{ borderColor: d.colors?.border ?? 'rgb(229, 231, 235)' }}
    />
  )
}
