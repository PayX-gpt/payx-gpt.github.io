import { useEffect, useState } from 'react'
import type { Block } from '../types'

export function Loading({ block }: { block: Block }) {
  const d = block.data
  const total = (d.time ?? 5) * 1000
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - started) / total) * 100))
      setPct(p)
      if (p >= 100) clearInterval(id)
    }, 60)
    return () => clearInterval(id)
  }, [block.id, total])

  return (
    <div id={block.id} className="flex flex-auto scroll-mt-7 justify-center fade-in" style={{ color: d.colors?.text }}>
      <div className="flex min-w-80 max-w-lg flex-auto flex-col items-center gap-4 p-4">
        <div className="relative flex w-11/12 items-center rounded-full p-0.5" style={{ color: '#000000', backgroundColor: 'rgb(229, 231, 235)' }}>
          <div className="h-5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: d.colors?.focus }} />
          <div className="absolute w-full flex-auto text-center text-xs font-semibold text-current">{pct}%</div>
        </div>
        <div className="flex flex-auto flex-col items-center gap-3">
          <h1 className="tiptap-rendering text-center text-base font-bold leading-6">{d.title}</h1>
          <div className="tiptap-rendering text-center text-sm">{d.subtitle}</div>
        </div>
      </div>
    </div>
  )
}
