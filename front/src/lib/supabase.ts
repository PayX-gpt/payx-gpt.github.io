import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Cliente do Supabase. Fica `null` enquanto as variáveis não estiverem
 * configuradas — nesse caso o tracking vira no-op e o /live usa dados de
 * demonstração, em vez de quebrar o funil.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // Mantém a sessão do painel no navegador e renova o token sozinho:
          // você entra uma vez e continua conectado nos dias seguintes.
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'quiz-ia-pro-painel',
        },
      })
    : null

export const isSupabaseConfigured = Boolean(url && anonKey)

/** Nome da tabela de eventos (mesmo formato do /live do OB LOVABLE V1). */
export const EVENTS_TABLE = 'funnel_events'
