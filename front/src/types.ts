export type DelayToShow = {
  type: 'time' | 'video'
  enabled: boolean
  seconds: number
  videoId: string | null
}

export type Block = {
  id: string
  type: string
  title?: string
  data: any
}

export type FunnelNode = {
  id: string
  type: 'page' | 'function'
  data: {
    slug?: string
    title?: string
    type?: string
    url?: string
    asPercentage?: number
    content?: Block[]
  }
}

export type Edge = {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}

export type Theme = {
  dark: boolean
  logo?: { uuid: string; width: number; height: number }
  color: string
  bgColor: string
  spacing: string
  rounding: string
  textColor: string
}

export type Funnel = {
  id: number
  name: string
  nodes: FunnelNode[]
  edges: Edge[]
  url: string
  theme: Theme
  settings: any
}
