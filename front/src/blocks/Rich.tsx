/** Renderiza o HTML rico (tiptap) exatamente como vem do funil. */
export function Rich({ html, className, style }: { html?: string | null; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html ?? '' }} />
}
