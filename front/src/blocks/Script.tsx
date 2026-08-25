import type { Block } from '../types'
import { HtmlEmbed } from './HtmlEmbed'

/** Bloco de script/preload — invisível, igual ao original. */
export function ScriptBlock({ block }: { block: Block }) {
  const d = block.data
  return (
    <div id={block.id} className={`max-w-full flex-auto scroll-mt-7 justify-center ${d.visible ? 'flex' : 'hidden'} fade-in text-center`}>
      <HtmlEmbed className="w-full max-w-full overflow-hidden" html={d.script ?? ''} />
    </div>
  )
}
