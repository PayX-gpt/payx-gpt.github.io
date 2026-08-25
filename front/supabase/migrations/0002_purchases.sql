-- Vendas do funil, alimentadas pelo webhook do checkout (Ticto).
-- Sem esta tabela os cards de receita, ticket médio e taxa de aprovação
-- não têm de onde tirar número.

CREATE TABLE IF NOT EXISTS public.purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Liga a venda à sessão do funil (vai no link do checkout como session_id).
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
