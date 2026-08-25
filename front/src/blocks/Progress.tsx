import type { Block } from '../types'

export function Progress({ block }: { block: Block }) {
  const bar = block.data.progressBar ?? {}
  const pct = bar.targetPercentage ?? 0
  const css = `
    @keyframes gb-${block.id} {
      0%   { width: ${pct}%; }
      100% { width: ${pct}%; }
    }
    [data-xq-element-id="${block.id}"] .xq-container {
      background-color: ${bar.backgroundColor};
      border-radius: ${bar.borderRadius};
      height: ${bar.height};
    }
    [data-xq-element-id="${block.id}"] .xq-progress-bar {
      width: ${pct}%;
      animation: gb-${block.id} 300ms ease-out forwards;
      background-image: linear-gradient(to right, ${bar.startColor}, ${bar.endColor});
      border-radius: 0 ${bar.borderRadius} ${bar.borderRadius} 0;
      height: ${bar.height};
    }
  `
  return (
    <>
      <div id={block.id} className="flex flex-auto scroll-mt-7" data-xq-element-id={block.id}>
        <div className="xq-container flex-auto overflow-hidden rounded-full">
          <div className="xq-progress-bar h-3.5 origin-left rounded-l-full" />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: css }} />
    </>
  )
}
