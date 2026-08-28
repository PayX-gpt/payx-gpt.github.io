import { useEffect, useState } from 'react'
import type { Block } from '../types'
import { Rich } from './Rich'

/**
 * `?nodelay=1` libera na hora os botões que têm espera.
 *
 * Existe para conferência: as etapas de vídeo seguram o avanço por até
 * 5min20s, e esperar isso a cada teste é inviável. Quem chega pelo anúncio
 * não usa o parâmetro, então a experiência real fica intacta.
 */
function bypassDelay(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('nodelay') === '1'
  } catch {
    return false
  }
}

export function ButtonBlock({ block, onClick }: { block: Block; onClick: () => void }) {
  const d = block.data
  const delay = d.delayToShow ?? {}
  const skip = bypassDelay()
  const [visible, setVisible] = useState(!delay.enabled || skip)

  const total = delay.seconds ?? 0
  const [left, setLeft] = useState(total)

  useEffect(() => {
    if (!delay.enabled || skip) {
      setVisible(true)
      return
    }
    setVisible(false)
    setLeft(total)
    const startedAt = Date.now()
    // Conta pelo relógio, não somando ticks: aba em segundo plano estrangula
    // o setInterval e o contador atrasaria em relação à liberação real.
    const tick = setInterval(() => {
      const remaining = Math.ceil((total * 1000 - (Date.now() - startedAt)) / 1000)
      setLeft(Math.max(0, remaining))
    }, 250)
    const done = setTimeout(() => setVisible(true), total * 1000)
    return () => {
      clearInterval(tick)
      clearTimeout(done)
    }
  }, [block.id, delay.enabled, total, skip])

  // Enquanto o vídeo não chega no ponto, o lugar do botão mostra quanto
  // falta — assim o lead sabe que tem algo vindo, em vez de achar que a
  // página travou e sair.
  if (!visible) {
    const elapsed = total > 0 ? ((total - left) / total) * 100 : 0
    const mm = Math.floor(left / 60)
    const ss = String(left % 60).padStart(2, '0')
    // Espera longa não mostra o número: ver "5:12" faz o lead desistir antes
    // de começar. A barra continua enchendo, então o retorno visual fica.
    const ESPERA_LONGA = 120
    const rotulo = total > ESPERA_LONGA ? 'Aguarde' : `Aguarde ${mm > 0 ? `${mm}:${ss}` : `${left}s`}`
    return (
      <div id={block.id} className="flex flex-auto justify-center scroll-mt-7">
        <div className="flex max-w-lg flex-auto flex-col items-center gap-2">
          <div
            className="flex w-full flex-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] py-5 text-center font-bold"
            aria-live="polite"
          >
            <span className="text-sm opacity-70">{rotulo}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/40 transition-all duration-300 ease-linear"
              style={{ width: `${elapsed}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id={block.id} className="flex flex-auto justify-center scroll-mt-7">
      <div className="flex max-w-lg flex-auto justify-center tiptap-rendering">
        <div className="block-button-wrapper flex flex-auto">
          <button
            type="button"
            onClick={onClick}
            className={`block-button flex-auto py-5 text-center font-bold transition-all rounded-xl ${d.animation ?? ''}`}
            style={{
              backgroundColor: d.colors?.focus,
              // Borda inferior de 8px: é o "relevo" do botão no original.
              borderColor: d.colors?.focusBorder ?? 'rgba(255, 255, 255, 0.1)',
              color: d.colors?.text ?? '#ffffff',
            }}
          >
            <Rich html={d.title} />
          </button>
        </div>
      </div>
    </div>
  )
}
