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
-- Vendas do funil, alimentadas pelo webhook do checkout (Hub.la).
-- Sem esta tabela os cards de receita, ticket médio e taxa de aprovação
-- não têm de onde tirar número.

CREATE TABLE IF NOT EXISTS public.purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Liga a venda à sessão do funil (vai no link do checkout como gtl_sid).
  session_id     TEXT,
  transaction_id TEXT UNIQUE,
  status         TEXT NOT NULL,          -- paid | pending | refused | refunded | chargeback
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'BRL',
  payment_method TEXT,
  product_name   TEXT,
  buyer_name     TEXT,
  buyer_email    TEXT,
  -- Origem da campanha, copiada da sessão no momento da venda.
  utm_source     TEXT,
  utm_medium     TEXT,
  utm_campaign   TEXT,
  utm_content    TEXT,
  utm_term       TEXT,
  raw            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS purchases_created_at_idx ON public.purchases (created_at DESC);
CREATE INDEX IF NOT EXISTS purchases_status_idx     ON public.purchases (status, created_at DESC);
CREATE INDEX IF NOT EXISTS purchases_session_idx    ON public.purchases (session_id);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Só leitura pelo painel. A escrita é exclusiva do webhook, que usa a
-- service role key e portanto ignora RLS — o navegador nunca insere venda.
DROP POLICY IF EXISTS "leitura das vendas" ON public.purchases;
CREATE POLICY "leitura das vendas"
  ON public.purchases FOR SELECT TO authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
-- Configuração do funil editável pelo painel (pesos do teste A/B).

CREATE TABLE IF NOT EXISTS public.funnel_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.funnel_config (key, value)
VALUES ('variant_weights', '{"A":100,"B":0,"C":0,"D":0}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.funnel_config ENABLE ROW LEVEL SECURITY;

-- O funil precisa ler os pesos no navegador.
DROP POLICY IF EXISTS "leitura da config" ON public.funnel_config;
CREATE POLICY "leitura da config"
  ON public.funnel_config FOR SELECT TO anon, authenticated
  USING (true);

-- Só quem estiver logado no painel pode mudar a divisão do tráfego.
-- Sem isso, qualquer um com a URL do /live redirecionaria suas campanhas.
DROP POLICY IF EXISTS "escrita da config" ON public.funnel_config;
CREATE POLICY "escrita da config"
  ON public.funnel_config FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
