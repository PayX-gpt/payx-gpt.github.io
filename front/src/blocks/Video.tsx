import { useEffect, useRef, useState } from 'react'
import type { Block } from '../types'
import { HtmlEmbed } from './HtmlEmbed'

const LARGURAS: Record<string, string> = {
  'w-full': '100%',
  'w-96': '384px',
  'w-80': '384px',
}

/**
 * Mantém o embed original do player (VTurb / PandaVideo) intacto, mas só o
 * monta quando ele se aproxima da tela.
 *
 * O PITCH tem quatro players na mesma página. Iniciando todos de uma vez,
 * eles competem por rede e CPU e vários acabam não abrindo — foi o que fazia
 * parecer que os vídeos estavam quebrados. Carregando sob demanda, cada um
 * sobe sozinho, no momento em que a pessoa vai assistir.
 */
export function Video({ block }: { block: Block }) {
  const d = block.data
  const alvo = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = alvo.current
    if (!el || visivel) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisivel(true)
      return
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisivel(true)
          obs.disconnect()
        }
      },
      // Começa a carregar meia tela antes, para já estar pronto na chegada.
      { rootMargin: '600px 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [visivel])

  return (
    <div id={block.id} ref={alvo} className="flex max-w-full flex-auto scroll-mt-7 justify-center fade-in">
      <div className="w-full max-w-full overflow-hidden" style={{ width: LARGURAS[d.size] ?? '100%' }}>
        {visivel ? (
          <HtmlEmbed html={d.source ?? ''} />
        ) : (
          // Reserva o espaço do player para a página não pular ao carregar.
          <div
            className="w-full animate-pulse rounded-xl bg-white/5"
            style={{ aspectRatio: (d.aspect ?? '9/16').replace('/', ' / ') }}
          />
        )}
      </div>
    </div>
  )
}
