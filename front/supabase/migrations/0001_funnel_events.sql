-- Eventos do funil "Quiz IA PRO".
-- Mesmo formato da tabela funnel_events do OB LOVABLE V1, para que o
-- painel /live use as mesmas consultas.

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id  TEXT NOT NULL,
  event_name  TEXT NOT NULL,
  event_data  JSONB NOT NULL DEFAULT '{}'::jsonb,
  page_url    TEXT,
  user_agent  TEXT
);

-- Índices para as consultas do painel: recorte por período, por tipo de
-- evento e agrupamento por sessão.
CREATE INDEX IF NOT EXISTS funnel_events_created_at_idx
  ON public.funnel_events (created_at DESC);
CREATE INDEX IF NOT EXISTS funnel_events_event_name_created_at_idx
  ON public.funnel_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS funnel_events_session_idx
  ON public.funnel_events (session_id);
-- Filtro por campanha (utm_source / utm_campaign dentro do JSON).
CREATE INDEX IF NOT EXISTS funnel_events_event_data_idx
  ON public.funnel_events USING GIN (event_data);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- O funil roda no navegador com a anon key, então precisa poder inserir.
DROP POLICY IF EXISTS "anon pode inserir eventos" ON public.funnel_events;
CREATE POLICY "anon pode inserir eventos"
  ON public.funnel_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Leitura só para quem está logado no painel. O funil no navegador usa a
-- anon key apenas para INSERIR eventos, então não precisa ler nada.
DROP POLICY IF EXISTS "leitura dos eventos" ON public.funnel_events;
CREATE POLICY "leitura dos eventos"
  ON public.funnel_events FOR SELECT TO authenticated
  USING (true);

-- Realtime: alimenta o feed ao vivo do painel.
ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_events;
