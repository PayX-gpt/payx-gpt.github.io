import type { Block } from '../types'
import { asset } from '../assets'

const WIDTHS: Record<string, string> = {
  'w-full': '100%',
  'w-96': '384px',
  'w-80': '384px',
  'w-64': '256px',
  'w-48': '192px',
}

export function ImageBlock({ block, onClick }: { block: Block; onClick?: () => void }) {
  const d = block.data
  const clickable = d.linkable !== false
  return (
    <div
      id={block.id}
      onClick={clickable ? onClick : undefined}
      className={`flex flex-auto scroll-mt-7 justify-center fade-in${clickable ? ' cursor-pointer transition-all duration-300 hover:scale-[1.02]' : ''}`}
    >
      <img
        alt=""
        width={d.image?.width}
        height={d.image?.height}
        src={asset(d.image?.uuid)}
        style={{ color: 'transparent', width: WIDTHS[d.size] ?? '100%', height: '100%' }}
      />
    </div>
  )
}
