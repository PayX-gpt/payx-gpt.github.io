import {
  Brain, CalendarClock, Clock, CreditCard, DollarSign, Gift, Loader, MessageSquare,
  PlayCircle, Rocket, Sparkles, Star, Target, ThumbsUp, Users, Zap,
} from 'lucide-react'

export type StepDef = {
  id: string
  slug: string
  /** Nome da etapa no funil. */
  title: string
  /** Rótulo curto, para os quadros do mapa em tempo real. */
  label: string
  icon: React.ElementType
}

/** As 20 etapas do caminho principal, na ordem em que o lead percorre. */
export const STEPS: StepDef[] = [
  { id: 'dfb3bf0a-aa44-4180-8a66-35b61f3b4948', slug: '5g4a4l2l', title: "Hook Page V.1 ORIGINAL", label: "Intro", icon: Zap },
  { id: '9f4238cb-69aa-4f0d-ac73-231caa09ed2b', slug: '1v27142j', title: "Etapa 1", label: "Idade", icon: Users },
  { id: 'd05d7ad4-13ab-48bb-a93b-ec0271d2cb8d', slug: '5v1g294c', title: "Etapa 2", label: "Motivo", icon: Brain },
  { id: '34062b57-0cc9-4ec1-be57-e0920289fd79', slug: '283m563h', title: "Etapa 3", label: "Tentou Online", icon: Target },
  { id: 'ff154f21-e183-4403-a507-eaef05abf395', slug: '5y035p50', title: "Etapa 4 (Depoimentos)", label: "Prova Social", icon: Star },
  { id: '9ac08cd0-e5e5-4dd0-a68e-c3338ae10226', slug: '315t6b62', title: "Etapa 5", label: "Disposição", icon: ThumbsUp },
  { id: '772a5415-9a2c-4ca2-81e9-5b685849d86b', slug: '2q6b5s5r', title: "Etapa 6 (Video 1)", label: "Vídeo 1", icon: PlayCircle },
  { id: '277aa6a9-88e2-407a-9576-ffe280bfc760', slug: '0b6w3f43', title: "Etapa 7", label: "Meta Renda", icon: Target },
  { id: '985658ba-850f-4eea-8470-16ef357b888f', slug: '1d63000k', title: "Etapa 8", label: "Disponibilidade", icon: Clock },
  { id: '1795b8aa-db4b-4843-904f-3c1e5a12dd58', slug: '6w1b5k5v', title: "Etapa 9 (Video 2)", label: "Vídeo 2", icon: PlayCircle },
  { id: 'e17a1f4e-0220-4c1e-865c-823eefe7c308', slug: '1b09635u', title: "Etapa 10", label: "Objetivo", icon: Rocket },
  { id: '1a2c156c-dd56-4dc2-b166-1dd847c55e91', slug: '2v5v4e2i', title: "Etapa 11", label: "Início", icon: CalendarClock },
  { id: 'ec79231b-5cd1-4cf5-9c89-d312a5f91cbf', slug: '0h1l6l70', title: "Etapa 12", label: "Análise", icon: Loader },
  { id: '8f89d9f8-2458-4a7d-95a9-136654172bae', slug: '0c1l4z2l', title: "Etapa 13 (IA LIBERADA)", label: "Demo IA", icon: Sparkles },
  { id: 'f6d810a8-e888-4b33-a6a9-a8c99ceb5c57', slug: '285y2m67', title: "Etapa 14 (Depoimentos)", label: "Depoimentos", icon: MessageSquare },
  { id: 'cdd0ad91-4e7e-40a8-a363-b36b42bfcb76', slug: '2n610036', title: "Etapa 15 (Video 3)", label: "Vídeo 3", icon: PlayCircle },
  { id: '2ccf9f2f-06e7-4e35-a1c2-39469cd6beb0', slug: '4n3k0627', title: "Etapa 16", label: "Preço", icon: DollarSign },
  { id: '0a60a54f-714a-44b4-9db6-0bb966f9834f', slug: '5m736x4h', title: "Etapa 17", label: "Oferta", icon: Gift },
  { id: '795e3845-5475-4fd7-91b3-e26af0c7c180', slug: '334n1a6y', title: "Etapa 18 (Video 4)", label: "Vídeo 4", icon: PlayCircle },
  { id: '4517ca2f-99fd-4795-aa2d-842d96d501bf', slug: '162p2v0j', title: "PITCH", label: "Pitch", icon: CreditCard },
]

export const STEP_BY_ID = new Map(STEPS.map((s) => [s.id, s]))
export const stepLabel = (id: string) => STEP_BY_ID.get(id)?.label ?? '—'
