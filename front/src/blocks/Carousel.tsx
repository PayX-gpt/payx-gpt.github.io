import { useRef, useState } from 'react'
import type { Block } from '../types'
import { asset } from '../assets'

export function Carousel({ block }: { block: Block }) {
  const items: any[] = block.data.content ?? []
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  const goTo = (i: number) => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div id={block.id} className="flex flex-auto scroll-mt-7 flex-col gap-3">
      <div className="flex flex-auto scroll-mt-7 justify-center gap-6 rounded-xl !pointer-events-auto relative items-center overflow-hidden !border-none !bg-transparent">
        <div
          ref={ref}
          onScroll={onScroll}
          className="carousel flex flex-auto cursor-pointer snap-x snap-mandatory overflow-x-auto scroll-smooth fade-in"
          style={{ animation: '1s ease-out 1s 1 normal none running bounce' }}
        >
          {items.map((it) => (
            <img
              key={it.id}
              alt=""
              width={it.image?.width}
              height={it.image?.height}
              src={asset(it.image?.uuid)}
              className="pointer-events-none w-full min-w-full shrink-0 snap-center"
              style={{ color: 'transparent' }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-auto justify-center gap-1.5">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            aria-label={`Ir para o slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${i === active ? 'w-5 bg-white' : 'w-2 bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  )
}
