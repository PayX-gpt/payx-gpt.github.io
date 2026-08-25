import { useEffect, useState } from 'react'
import type { Block } from '../types'
import { Rich } from './Rich'

function fmt(total: number) {
  const s = Math.max(0, total)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

export function StopWatch({ block }: { block: Block }) {
  const d = block.data
  const initial = (d.hours ?? 0) * 3600 + (d.minutes ?? 0) * 60 + (d.seconds ?? 0)
  const [left, setLeft] = useState(initial)

  useEffect(() => {
    setLeft(initial)
    const id = setInterval(() => setLeft((v: number) => (v > 0 ? v - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [block.id, initial])

  const css = d.containerCss ?? {}
  const done = left === 0

  return (
    <div
      id={block.id}
      className="fadeIn mx-auto flex w-full max-w-full flex-auto flex-col gap-2 text-pretty border p-4 shadow-lg bg-inherit text-inherit shadow-gray-600/5 fixed left-0 right-0 top-0 z-50 h-12 rounded-none border-none py-2.5 drop-shadow-sm"
      style={{
        backgroundColor: css.background?.backgroundColor,
        color: css.text?.color,
        borderColor: '#000000',
        borderStyle: 'solid',
        borderRadius: '36px',
        borderWidth: '2px',
      }}
    >
      <div className="flex items-center justify-center gap-2 mx-auto max-w-lg px-4">
        <div className="font-sans text-lg font-bold tabular-nums">{fmt(left)}</div>
        {d.iconActive && (
          <div className="flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide flex-none">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14.5 16" />
            </svg>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="line-clamp-1 text-xs font-medium">
            {done && d.endMessageShow ? <span>{d.endMessage}</span> : d.activeMessageShow ? <Rich html={d.activeMessage} /> : <p />}
          </div>
        </div>
      </div>
    </div>
  )
}
