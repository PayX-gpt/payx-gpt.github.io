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
