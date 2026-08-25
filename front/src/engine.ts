import type { Edge, Funnel, FunnelNode } from './types'

/**
 * Motor de navegação do funil: reproduz a mesma lógica do xquiz.
 * Cada opção de quiz e cada botão é um "sourceHandle"; a aresta
 * correspondente define para qual etapa ele leva.
 */
export class FunnelEngine {
  private nodes = new Map<string, FunnelNode>()
  private byHandle = new Map<string, Edge>()
  private bySource = new Map<string, Edge[]>()
  private pathIndex: Map<string, number> | null = null

  constructor(private funnel: Funnel) {
    for (const n of funnel.nodes) this.nodes.set(n.id, n)
    for (const e of funnel.edges) {
      this.byHandle.set(e.sourceHandle, e)
      const list = this.bySource.get(e.source) ?? []
      list.push(e)
      this.bySource.set(e.source, list)
    }
  }

  node(id: string): FunnelNode | undefined {
    return this.nodes.get(id)
  }

  /** Primeira página real do funil, partindo do nó "Início". */
  start(): string {
    const first = this.bySource.get('root')?.[0]
    return this.resolve(first?.target ?? '')
  }

  /**
   * Resolve nós de função (link / teste A/B) até chegar numa página.
   * Retorna o id da página, ou uma string "link:<url>" quando o
   * destino é um redirecionamento externo (checkout).
   */
  resolve(nodeId: string): string {
    const node = this.nodes.get(nodeId)
    if (!node) return ''
    if (node.type !== 'function') return nodeId

    if (node.data.type === 'link') return `link:${node.data.url}`

    if (node.data.type === 'abtest') {
      const branches = this.bySource.get(node.id) ?? []
      if (!branches.length) return ''
      const pct = node.data.asPercentage ?? 50
      const pick = Math.random() * 100 < pct ? branches[0] : branches[1] ?? branches[0]
      return this.resolve(pick.target)
    }

    const next = this.bySource.get(node.id)?.[0]
    return next ? this.resolve(next.target) : ''
  }

  /**
   * Caminho principal do funil, do início até o checkout — a ordem em que
   * o lead realmente percorre as etapas. É a espinha do relatório do /live.
   */
  mainPath(): FunnelNode[] {
    const path: FunnelNode[] = []
    const seen = new Set<string>()
    let current = this.bySource.get('root')?.[0]?.target
    while (current && !seen.has(current)) {
      seen.add(current)
      const node = this.nodes.get(current)
      if (!node) break
      path.push(node)
      const next = this.bySource.get(current)?.[0]
      if (!next) break
      current = next.target
    }
    return path
  }

  /** Posição da etapa no caminho principal (1-based); 0 se estiver fora dele. */
  stepIndex(nodeId: string): number {
    if (this.pathIndex === null) {
      this.pathIndex = new Map(this.mainPath().map((n, i) => [n.id, i + 1]))
    }
    return this.pathIndex.get(nodeId) ?? 0
  }

  /**
   * Próxima etapa a partir do handle (id da opção ou do botão) clicado.
   *
   * Se a etapa não tiver nenhuma aresta de saída, cai na primeira etapa do
   * caminho principal depois do hook. Isso existe por causa do "Hook V.2 —
   * GIF PIX", que está no funil original sem nenhuma ligação: sem esse
   * desvio, a variante prenderia o lead numa tela sem saída.
   */
  next(handleId: string, currentNodeId: string): string {
    const edge = this.byHandle.get(handleId) ?? this.bySource.get(currentNodeId)?.[0]
    if (edge) return this.resolve(edge.target)

    const fallback = this.mainPath()[1]
    return fallback && fallback.id !== currentNodeId ? fallback.id : ''
  }
}
