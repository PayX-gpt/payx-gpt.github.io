#!/usr/bin/env bash
# Cria o schema do funil num projeto Supabase e mostra as chaves do .env.
#
#   ./scripts/setup-supabase.sh <project-ref>
#
# O <project-ref> é o identificador do projeto (Settings > General, ou o
# subdomínio da URL: https://<ref>.supabase.co).
#
# Requer o CLI autenticado:  supabase login

set -euo pipefail

REF="${1:-}"
if [[ -z "$REF" ]]; then
  echo "uso: $0 <project-ref>" >&2
  echo "     dica: supabase projects list" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> Vinculando ao projeto $REF"
supabase link --project-ref "$REF"

echo "==> Aplicando as migrations"
supabase db push

echo
echo "==> Pronto. Tabelas criadas: funnel_events, purchases, funnel_config"
echo
echo "Copie estes valores para o .env (e para as Variables do GitHub Actions):"
echo "  VITE_SUPABASE_URL=https://$REF.supabase.co"
echo -n "  VITE_SUPABASE_ANON_KEY="
supabase projects api-keys --project-ref "$REF" -o json 2>/dev/null \
  | python3 -c 'import sys,json;print(next((k["api_key"] for k in json.load(sys.stdin) if k["name"]=="anon"),"(não encontrada)"))' \
  || echo "(rode: supabase projects api-keys --project-ref $REF)"
echo
echo "Falta ainda:"
echo "  1. Criar seu usuário do painel em Authentication > Users"
echo "  2. Publicar o webhook de vendas:"
echo "     supabase functions deploy ticto-webhook --no-verify-jwt --project-ref $REF"
echo "     supabase secrets set TICTO_WEBHOOK_TOKEN=<um-token-secreto> --project-ref $REF"
