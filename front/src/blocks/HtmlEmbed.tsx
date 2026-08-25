import { useEffect, useRef } from 'react'

/**
 * Injeta um bloco de HTML bruto (players VTurb / PandaVideo, scripts de
 * tracking) e executa as tags <script>, que o innerHTML sozinho ignora.
 */
export function HtmlEmbed({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current
    if (!host) return
    host.innerHTML = html
    const scripts = Array.from(host.querySelectorAll('script'))
    for (const old of scripts) {
      const s = document.createElement('script')
      for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value)
      s.text = old.textContent ?? ''
      old.parentNode?.replaceChild(s, old)
    }
  }, [html])

  return <div ref={ref} className={className} style={style} />
}
