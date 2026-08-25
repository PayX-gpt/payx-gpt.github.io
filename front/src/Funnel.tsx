import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { initTracking, withTrackingParams } from './lib/tracking'
import { initPixels, pixelTrack } from './lib/pixels'
import { initBackredirect } from './lib/backredirect'
import { trackEvent, trackEventReliable } from './lib/metrics'
import { usePresence } from './hooks/usePresence'
import { STEP_BY_ID } from './lib/steps'
import { getVariant } from './lib/abtest'
import { refreshWeights } from './lib/config'
import funnelData from './funnel.json'
import { FunnelEngine } from './engine'
import type { Block, Funnel } from './types'

import { Progress } from './blocks/Progress'
import { Title } from './blocks/Title'
import { Text } from './blocks/Text'
import { ImageBlock } from './blocks/Image'
import { ButtonBlock } from './blocks/Button'
import { Quiz } from './blocks/Quiz'
import { Carousel } from './blocks/Carousel'
import { Video } from './blocks/Video'
import { Loading } from './blocks/Loading'
import { StopWatch } from './blocks/StopWatch'
import { Container } from './blocks/Container'
import { ScriptBlock } from './blocks/Script'

const funnel = (funnelData as any).funnel as Funnel

export default function Funnel() {
  const engine = useMemo(() => new FunnelEngine(funnel), [])
  const [nodeId, setNodeId] = useState(() => {
    // ?step=<slug> ou ?step=<título da etapa> abre direto naquela etapa.
    const wanted = new URLSearchParams(window.location.search).get('step')
    if (wanted) {
      const found = funnel.nodes.find(
        (n) => n.data.slug === wanted || n.data.title?.toLowerCase() === wanted.toLowerCase(),
      )
      if (found) return found.id
    }
    // Sem ?step=, o funil abre na variante de hook sorteada para a sessão.
    return getVariant().nodeId || engine.start()
  })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const topRef = useRef<HTMLDivElement>(null)
  const stepEnteredAt = useRef<number>(Date.now())

  const stepMeta = useCallback(
    (id: string) => {
      const n = engine.node(id)
      const variant = getVariant()
      return {
        step_id: id,
        step_slug: n?.data.slug ?? null,
        step_title: n?.data.title ?? null,
        step_index: engine.stepIndex(id),
        variant_id: variant.id,
        variant_label: variant.label,
        // Tempo na etapa anterior — alimenta velocidade e auditoria.
        duration_ms: stepEnteredAt.current ? Date.now() - stepEnteredAt.current : null,
      }
    },
    [engine],
  )

  const go = useCallback(
    (handleId: string, extra: Record<string, unknown> = {}) => {
      const target = engine.next(handleId, nodeId)
      if (!target) return

      trackEvent('step_completed', { ...stepMeta(nodeId), handle_id: handleId, ...extra })

      if (target.startsWith('link:')) {
        const url = withTrackingParams(target.slice(5))
        // keepalive: o insert precisa sobreviver à saída da página.
        trackEventReliable('checkout_click', {
          ...stepMeta(nodeId),
          handle_id: handleId,
          destination: url,
        })
        pixelTrack('InitiateCheckout', { content_name: engine.node(nodeId)?.data.title })
        window.location.href = url
        return
      }
      setNodeId(target)
    },
    [engine, nodeId, stepMeta],
  )

  // Inicialização: origem do lead, pixels e captura do botão "voltar".
  const nodeIdRef = useRef(nodeId)
  nodeIdRef.current = nodeId
  useEffect(() => {
    initTracking()
    initPixels()
    // Busca os pesos do A/B para a próxima visita, sem bloquear esta.
    void refreshWeights()
    initBackredirect(() => engine.node(nodeIdRef.current)?.data.title ?? '')
    trackEvent('page_loaded', stepMeta(nodeIdRef.current))
  }, [engine, stepMeta])

  // Uma visualização por etapa.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    const meta = stepMeta(nodeId)
    trackEvent('step_viewed', meta)
    stepEnteredAt.current = Date.now()
    pixelTrack('ViewContent', { content_name: meta.step_title })
  }, [nodeId, stepMeta])

  const node = engine.node(nodeId)
  const blocks: Block[] = node?.data.content ?? []

  // Anuncia ao /live em que etapa esta sessão está agora.
  usePresence(nodeId, STEP_BY_ID.get(nodeId)?.label ?? node?.data.title ?? '')

  // O bloco "Redirecionar" avança sozinho depois de N segundos.
  const redirect = blocks.find((b) => b.type === 'redirectV3')
  useEffect(() => {
    if (!redirect) return
    const t = setTimeout(() => go(redirect.id), (redirect.data.time ?? 5) * 1000)
    return () => clearTimeout(t)
  }, [redirect, go])

  const hasFixedWatch = blocks.some((b) => b.type === 'stopWatchTime' && b.data.fixedInTop)
  const theme = funnel.theme

  return (
    <div
      ref={topRef}
      className="box-border flex min-h-screen flex-auto items-start justify-center px-5 py-7"
      style={{ color: theme.textColor, backgroundColor: theme.bgColor }}
    >
      <main className={`flex w-full min-w-80 max-w-lg flex-auto flex-col gap-8 sm:gap-10 md:gap-12 sm:pt-3${hasFixedWatch ? ' mt-10' : ''}`}>
        {blocks.map((block) => {
          switch (block.type) {
            case 'progressV3':
              return <Progress key={block.id} block={block} />
            case 'titleV3':
              return <Title key={block.id} block={block} />
            case 'textV3':
              return <Text key={block.id} block={block} />
            case 'imageV3':
              return <ImageBlock key={block.id} block={block} onClick={() => go(block.id)} />
            case 'buttonV3':
              return <ButtonBlock key={block.id} block={block} onClick={() => go(block.id)} />
            case 'quizV2':
              return (
                <Quiz
                  key={block.id}
                  block={block}
                  onAnswer={(optionId, label) => {
                    setAnswers((a) => ({ ...a, [block.id]: label }))
                    trackEvent('quiz_answered', {
                      ...stepMeta(nodeId),
                      question: block.data?.title ?? null,
                      option_id: optionId,
                      answer: label,
                    })
                    go(optionId, { answer: label })
                  }}
                />
              )
            case 'carouselV3':
              return <Carousel key={block.id} block={block} />
            case 'videoV3':
              return <Video key={block.id} block={block} />
            case 'loadingV3':
              return <Loading key={block.id} block={block} />
            case 'stopWatchTime':
              return <StopWatch key={block.id} block={block} />
            case 'containerV2':
              return <Container key={block.id} block={block} />
            case 'scriptV3':
              return <ScriptBlock key={block.id} block={block} />
            case 'redirectV3':
              return null
            default:
              return null
          }
        })}
      </main>
    </div>
  )
}
