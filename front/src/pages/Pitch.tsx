import { useEffect, useRef, useState } from 'react'
import type { Block } from '../types'
import { Rich } from '../blocks/Rich'
import { Video } from '../blocks/Video'
import { StopWatch } from '../blocks/StopWatch'

/**
 * Página de oferta.
 *
 * O funil entrega esta página como 29 blocos soltos — três vídeos verticais
 * empilhados, listas em texto corrido e botões espalhados, somando mais de
 * 5.000px de rolagem. Aqui os mesmos blocos são reagrupados em seções com
 * hierarquia: os depoimentos viram carrossel, as listas viram cartões, e o
 * botão acompanha a rolagem.
 *
 * Nenhum texto é inventado: tudo vem do conteúdo do funil.
 */

type Papeis = {
  timer?: Block
  titulo?: Block
  subtitulo?: Block
  depoimentos: { video: Block; autor?: Block }[]
  tituloEntrega?: Block
  entregas?: Block
  preco?: Block
  garantia?: Block
  tituloBonus?: Block
  bonus?: Block
  tituloRanking?: Block
  simulador?: Block
  tituloFinal?: Block
  cta?: Block
}

/** Reconhece a página de oferta pela composição, não por id fixo. */
export function ehPaginaDeOferta(blocks: Block[]): boolean {
  const videos = blocks.filter((b) => b.type === 'videoV3').length
  const botoes = blocks.filter((b) => b.type === 'buttonV3').length
  return blocks.some((b) => b.type === 'stopWatchTime') && videos >= 3 && botoes >= 3
}

function classificar(blocks: Block[]): Papeis {
  const p: Papeis = { depoimentos: [] }
  const titulos: Block[] = []
  const textos: Block[] = []
  const videos: Block[] = []

  for (const b of blocks) {
    if (b.type === 'stopWatchTime') p.timer = b
    else if (b.type === 'titleV3') titulos.push(b)
    else if (b.type === 'textV3') textos.push(b)
    else if (b.type === 'videoV3') videos.push(b)
    else if (b.type === 'buttonV3' && !p.cta) p.cta = b
  }

  // Ordem estável do funil: manchete, subtítulo, 3 depoimentos, entrega,
  // bônus, ranking, fechamento.
  p.titulo = titulos[0]
  p.subtitulo = titulos[1]
  p.tituloEntrega = titulos[2]
  p.entregas = titulos[3]
  p.tituloBonus = titulos[4]
  p.tituloRanking = titulos[5]
  p.tituloFinal = titulos[6]

  p.depoimentos = videos.slice(0, 3).map((v, i) => ({ video: v, autor: textos[i] }))
  p.simulador = videos[3]

  p.preco = textos[3]
  p.garantia = textos[4]
  p.bonus = textos[5]

  return p
}

function Secao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-4 ${className}`}>{children}</section>
}

/** Carrossel de depoimentos: um vídeo por vez, em vez de três empilhados. */
function Depoimentos({ itens }: { itens: Papeis['depoimentos'] }) {
  const trilho = useRef<HTMLDivElement>(null)
  const [ativo, setAtivo] = useState(0)

  const aoRolar = () => {
    const el = trilho.current
    if (!el) return
    setAtivo(Math.round(el.scrollLeft / el.clientWidth))
  }
  const irPara = (i: number) => {
    const el = trilho.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={trilho}
        onScroll={aoRolar}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {itens.map(({ video, autor }) => (
          <div key={video.id} className="w-full min-w-full shrink-0 snap-center">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <Video block={video} />
            </div>
            {autor && (
              <div className="pt-2 text-center text-sm text-white/70">
                <Rich html={autor.data.text?.content} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        {itens.map((it, i) => (
          <button
            key={it.video.id}
            type="button"
            onClick={() => irPara(i)}
            aria-label={`Depoimento ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === ativo ? 'w-6 bg-white' : 'w-2 bg-white/30'}`}
          />
        ))}
      </div>
      <p className="text-center text-[11px] text-white/35">
        {ativo + 1} de {itens.length} · arraste para ver os outros
      </p>
    </div>
  )
}

function Cartao({ children, destaque = false }: { children: React.ReactNode; destaque?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        destaque ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      {children}
    </div>
  )
}

export function PitchPage({ blocks, onCta }: { blocks: Block[]; onCta: (handleId: string) => void }) {
  const p = classificar(blocks)
  const [mostrarBarra, setMostrarBarra] = useState(false)
  const marco = useRef<HTMLDivElement>(null)

  // A barra fixa aparece depois que o primeiro botão sai da tela, para a
  // ação ficar sempre ao alcance no meio de uma página longa.
  useEffect(() => {
    const el = marco.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setMostrarBarra(!e.isIntersecting && e.boundingClientRect.top < 0), {
      threshold: 0,
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const Botao = ({ rotulo = 'Garantir Meu Acesso' }: { rotulo?: string }) =>
    p.cta ? (
      <button
        type="button"
        onClick={() => onCta(p.cta!.id)}
        className="pulse w-full rounded-xl border-b-[6px] border-black/25 bg-[#43ae0a] py-4 text-center text-base font-bold text-white transition-transform active:scale-[0.99]"
      >
        {rotulo}
      </button>
    ) : null

  return (
    <div className="flex flex-col gap-10 pb-28">
      {p.timer && <StopWatch block={p.timer} />}

      {/* manchete */}
      <Secao className="gap-3 pt-2">
        {p.titulo && <Rich className="tiptap-rendering" html={p.titulo.data.title?.content} />}
        {p.subtitulo && (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
            <Rich className="tiptap-rendering" html={p.subtitulo.data.title?.content} />
          </div>
        )}
      </Secao>

      {/* prova social */}
      {p.depoimentos.length > 0 && (
        <Secao>
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-white/45">
            Quem já está usando
          </h2>
          <Depoimentos itens={p.depoimentos} />
        </Secao>
      )}

      {/* o que recebe */}
      {(p.tituloEntrega || p.entregas) && (
        <Secao>
          {p.tituloEntrega && <Rich className="tiptap-rendering" html={p.tituloEntrega.data.title?.content} />}
          {p.entregas && (
            <Cartao>
              <Rich className="pitch-lista tiptap-rendering" html={p.entregas.data.title?.content} />
            </Cartao>
          )}
        </Secao>
      )}

      {/* preço e ação */}
      <Secao>
        {p.preco && (
          <Cartao destaque>
            <Rich className="pitch-preco tiptap-rendering text-center" html={p.preco.data.text?.content} />
          </Cartao>
        )}
        <div ref={marco} />
        <Botao />
      </Secao>

      {/* garantia */}
      {p.garantia && (
        <Secao>
          <Cartao>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <span aria-hidden>🛡</span> Garantia
            </div>
            <Rich className="tiptap-rendering" html={p.garantia.data.text?.content} />
          </Cartao>
          <Botao />
        </Secao>
      )}

      {/* bônus */}
      {(p.tituloBonus || p.bonus) && (
        <Secao>
          {p.tituloBonus && <Rich className="tiptap-rendering" html={p.tituloBonus.data.title?.content} />}
          {p.bonus && (
            <Cartao>
              <Rich className="pitch-lista tiptap-rendering" html={p.bonus.data.text?.content} />
            </Cartao>
          )}
          <Botao />
        </Secao>
      )}

      {/* ranking + simulador */}
      {(p.tituloRanking || p.simulador) && (
        <Secao>
          {p.tituloRanking && <Rich className="tiptap-rendering" html={p.tituloRanking.data.title?.content} />}
          {p.simulador && (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <Video block={p.simulador} />
            </div>
          )}
        </Secao>
      )}

      {/* fechamento */}
      <Secao>
        {p.tituloFinal && <Rich className="tiptap-rendering" html={p.tituloFinal.data.title?.content} />}
        <Botao />
      </Secao>

      {/* barra fixa: a ação nunca fica fora de alcance */}
      {p.cta && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1220]/95 p-3 backdrop-blur transition-transform duration-300 ${
            mostrarBarra ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="mx-auto max-w-lg">
            <Botao />
          </div>
        </div>
      )}
    </div>
  )
}
