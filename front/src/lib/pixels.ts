/**
 * Carregamento dos pixels de anúncio.
 *
 * Cada pixel só é injetado se o ID correspondente estiver no .env — sem ID,
 * nada é carregado e nenhuma requisição sai. Assim o funil roda igual em
 * desenvolvimento, sem sujar os dados das campanhas.
 */

const META_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined
const TIKTOK_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
const GTM_ID = import.meta.env.VITE_GTM_CONTAINER_ID as string | undefined

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    ttq?: { track: (e: string, p?: unknown) => void; page: () => void; load: (id: string) => void }
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

let loaded = false

function injectScript(src: string, async = true) {
  const s = document.createElement('script')
  s.src = src
  s.async = async
  document.head.appendChild(s)
}

function loadMeta(id: string) {
  /* eslint-disable */
  ;(function (f: any, b: any, e: string, v: string) {
    if (f.fbq) return
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    })
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    const t = b.createElement(e) as HTMLScriptElement
    t.async = true
    t.src = v
    const s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */
  window.fbq?.('init', id)
  window.fbq?.('track', 'PageView')
}

function loadTikTok(id: string) {
  /* eslint-disable */
  ;(function (w: any, d: Document, t: string) {
    w.TiktokAnalyticsObject = t
    const ttq: any = (w[t] = w[t] || [])
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']
    ttq.setAndDefer = function (obj: any, method: string) {
      obj[method] = function () {
        obj.push([method].concat(Array.prototype.slice.call(arguments, 0)))
      }
    }
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i])
    ttq.load = function (e: string) {
      const url = 'https://analytics.tiktok.com/i18n/pixel/events.js'
      ttq._i = ttq._i || {}
      ttq._i[e] = []
      ttq._i[e]._u = url
      ttq._t = ttq._t || {}
      ttq._t[e] = +new Date()
      ttq._o = ttq._o || {}
      ttq._o[e] = {}
      const s = d.createElement('script')
      s.async = true
      s.src = `${url}?sdkid=${e}&lib=${t}`
      const f = d.getElementsByTagName('script')[0]
      f.parentNode!.insertBefore(s, f)
    }
    ttq.load(id)
    ttq.page()
  })(window, document, 'ttq')
  /* eslint-enable */
}

function loadGA(id: string) {
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${id}`)
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', id)
}

function loadGTM(id: string) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
  injectScript(`https://www.googletagmanager.com/gtm.js?id=${id}`)
}

export function initPixels() {
  if (loaded) return
  loaded = true
  if (META_ID) loadMeta(META_ID)
  if (TIKTOK_ID) loadTikTok(TIKTOK_ID)
  if (GA_ID) loadGA(GA_ID)
  if (GTM_ID) loadGTM(GTM_ID)
}

/** Dispara o mesmo evento em todos os pixels configurados. */
export function pixelTrack(event: string, params: Record<string, unknown> = {}) {
  try {
    window.fbq?.('track', event, params)
    window.ttq?.track(event, params)
    window.gtag?.('event', event, params)
    window.dataLayer?.push({ event, ...params })
  } catch {
    /* ignora */
  }
}
