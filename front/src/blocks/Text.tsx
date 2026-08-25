import type { Block } from '../types'
import { Rich } from './Rich'

export function Text({ block }: { block: Block }) {
  const t = block.data.text ?? {}
  const css = `[data-xq-element-id="${block.id}"] .xq-container {${t.fontSize ? ` font-size: ${t.fontSize};` : ''}${t.lineHeight ? ` line-height: ${t.lineHeight};` : ''}${t.color ? ` color: ${t.color};` : ''}}`
  return (
    <div id={block.id}>
      <div data-xq-element-id={block.id} className="w-full">
        <Rich className="xq-container tiptap-rendering w-full" html={t.content} />
      </div>
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </div>
  )
}
