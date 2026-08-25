import { trackEventReliable } from './metrics'

/**
 * Backredirect — portado do script do funil original.
 *
 * Empilha um estado falso no histórico e, quando o lead aperta "voltar",
 * manda ele para a oferta de recuperação em vez de deixar sair. Dispara no
 * máximo uma vez por sessão e leva os parâmetros da URL atual junto, para
 * não perder a atribuição da campanha.
 */

const BACKREDIRECT_URL =
  (import.meta.env.VITE_BACKREDIRECT_URL as string | undefined) ??
  'https://www.xcapitalpro.online/back19lt'

const FLAG_KEY = 'quiz_backredirect_fired'

function buildRedirectUrl(): string {
  try {
    const current = new URL(window.location.href)
    const target = new URL(BACKREDIRECT_URL)
    current.searchParams.forEach((value, key) => {
      if (!target.searchParams.has(key)) target.searchParams.set(key, value)
    })
    return target.toString()
  } catch {
    const qs = window.location.search || ''
    return BACKREDIRECT_URL + (BACKREDIRECT_URL.includes('?') ? '' : qs)
  }
}

export function initBackredirect(getCurrentStep: () => string) {
  if (!BACKREDIRECT_URL) return
  try {
    if (sessionStorage.getItem(FLAG_KEY) === '1') return
  } catch {
    return
  }

  const doRedirect = () => {
    try {
      if (sessionStorage.getItem(FLAG_KEY) === '1') return
      sessionStorage.setItem(FLAG_KEY, '1')
    } catch {
      /* segue mesmo sem storage */
    }
    trackEventReliable('backredirect_fired', {
      step: getCurrentStep(),
      destination: BACKREDIRECT_URL,
    })
    // `replace` impede que o lead volte para o quiz de novo.
    window.location.replace(buildRedirectUrl())
  }

  try {
    history.pushState({ quizTrap: true }, '', window.location.href)
  } catch {
    /* ignora */
  }

  window.addEventListener('popstate', doRedirect)
}
