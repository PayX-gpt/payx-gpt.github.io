import type { Block } from '../types'
import { HtmlEmbed } from './HtmlEmbed'

const WIDTHS: Record<string, string> = {
  'w-full': '100%',
  'w-96': '384px',
  'w-80': '384px',
}

/** Mantém o embed original do player (VTurb / PandaVideo) intacto. */
export function Video({ block }: { block: Block }) {
  const d = block.data
  return (
    <div id={block.id} className="flex max-w-full flex-auto scroll-mt-7 justify-center fade-in">
      <div className="w-full max-w-full overflow-hidden" style={{ width: WIDTHS[d.size] ?? '100%' }}>
        <HtmlEmbed html={d.source ?? ''} />
      </div>
    </div>
  )
}
