/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_META_PIXEL_ID?: string
  readonly VITE_TIKTOK_PIXEL_ID?: string
  readonly VITE_GA_MEASUREMENT_ID?: string
  readonly VITE_GTM_CONTAINER_ID?: string
  readonly VITE_BACKREDIRECT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
