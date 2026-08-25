import type { Block } from '../types'
import { Rich } from './Rich'

export function Title({ block }: { block: Block }) {
  const { title, subtitle } = block.data
  const hasSub = subtitle?.content && subtitle.content.replace(/<p>\s*<\/p>/g, '').trim() !== ''
  return (
    <div id={block.id} className="tiptap-rendering pointer-events-none flex flex-auto flex-col gap-2">
      <Rich html={title?.content} style={title?.lineHeight ? { lineHeight: title.lineHeight } : undefined} />
      {hasSub && <Rich html={subtitle.content} style={subtitle?.lineHeight ? { lineHeight: subtitle.lineHeight } : undefined} />}
    </div>
  )
}
