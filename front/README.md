# Quiz IA PRO

Funil interativo de quiz, clonado etapa por etapa de `0f371c6o.xquiz.io`,
com rastreamento completo e painel de métricas em tempo real.

**No ar:** <https://payx-gpt.github.io/quiz-ia-pro/> · **Painel:** [/live](https://payx-gpt.github.io/quiz-ia-pro/live)

---

## Índice

- [Como rodar](#como-rodar)
- [Configuração](#configuração)
- [Como o funil funciona](#como-o-funil-funciona)
- [Etapas](#etapas)
- [Teste A/B](#teste-ab)
- [Rastreamento](#rastreamento)
- [Painel /live](#painel-live)
- [Publicação](#publicação)
- [Estrutura de arquivos](#estrutura-de-arquivos)

---

## Como rodar

```bash
npm install
npm run dev
```

Abre em <http://localhost:5273>. O layout é mobile-first — vale testar em
viewport de celular.

Sem configurar nada, o projeto **já roda**: o funil funciona por completo e o
painel abre em modo demonstração, com números simulados sobre as etapas reais.

## Configuração

Copie `.env.example` para `.env` e preencha o que for usar. Nenhuma variável é
obrigatória para o funil rodar.

| Variável | Para quê |
|---|---|
| `VITE_SUPABASE_URL` | Banco de eventos e presença ao vivo |
| `VITE_SUPABASE_ANON_KEY` | idem — chave pública, protegida por RLS |
| `VITE_META_PIXEL_ID` | Pixel do Meta |
| `VITE_TIKTOK_PIXEL_ID` | Pixel do TikTok |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics (`G-…`) |
| `VITE_GTM_CONTAINER_ID` | Google Tag Manager (`GTM-…`) |
| `VITE_BACKREDIRECT_URL` | Destino de quem aperta "voltar" |

Cada pixel só é carregado se o ID existir — sem ID, nenhuma requisição sai, e
rodar local não suja os dados das campanhas.

### Banco de dados

Com o [CLI do Supabase](https://supabase.com/docs/guides/cli) autenticado
(`supabase login`):

```bash
./scripts/setup-supabase.sh <project-ref>
```

O script vincula o projeto, aplica as três migrations e imprime as chaves para
o `.env`. Depois falta criar seu usuário do painel em **Authentication → Users**.

### Webhook de vendas

Sem ele, receita e ticket médio ficam zerados — o resto do painel funciona.

```bash
supabase functions deploy hubla-webhook --no-verify-jwt
supabase secrets set HUBLA_WEBHOOK_TOKEN=<token-secreto>
```

No Hub.la, aponte o webhook para:
`https://<ref>.supabase.co/functions/v1/hubla-webhook?token=<token-secreto>`

## Como o funil funciona

O conteúdo do funil vive em [`src/funnel.json`](src/funnel.json) — textos,
cores, tamanhos de fonte, opções de quiz, embeds de vídeo e as ligações entre
etapas. O app é um **renderizador desses dados**, não uma cópia visual: cada
tipo de bloco tem um componente em `src/blocks/` que reproduz a marcação do
funil original.

Editar o funil é editar o JSON. O render acompanha.

A navegação está em [`src/engine.ts`](src/engine.ts): cada opção de quiz e cada
botão é um *handle*, e as arestas do funil dizem para onde ele leva.

### Pré-visualizar uma etapa

```
http://localhost:5273/?step=162p2v0j     # por slug
http://localhost:5273/?step=Etapa 12     # por nome
http://localhost:5273/?variant=C         # força uma variante de hook
```

## Etapas

21 etapas no caminho principal:

| # | Slug | Etapa | Blocos |
|---|------|-------|--------|
| 1 | `5g4a4l2l` | Hook Page V.1 ORIGINAL | button, container, image, text, title |
| 2 | `1v27142j` | Etapa 1 | progress, quiz, title |
| 3 | `5v1g294c` | Etapa 2 | progress, quiz, title |
| 4 | `283m563h` | Etapa 3 | progress, quiz, title |
| 5 | `5y035p50` | Etapa 4 (Depoimentos) | button, carousel, progress, text, title |
| 6 | `315t6b62` | Etapa 5 | progress, quiz, title |
| 7 | `2q6b5s5r` | Etapa 6 (Video 1) | button, progress, script, title, video |
| 8 | `0b6w3f43` | Etapa 7 | progress, quiz, title |
| 9 | `1d63000k` | Etapa 8 | progress, quiz, title |
| 10 | `6w1b5k5v` | Etapa 9 (Video 2) | button, progress, script, title, video |
| 11 | `1b09635u` | Etapa 10 | progress, quiz, title |
| 12 | `2v5v4e2i` | Etapa 11 | progress, quiz, title |
| 13 | `0h1l6l70` | Etapa 12 | loading, progress, redirect, stopWatchTime, text, title |
| 14 | `0c1l4z2l` | Etapa 13 (IA LIBERADA) | button, container, title, video |
| 15 | `285y2m67` | Etapa 14 (Depoimentos) | button, carousel, text, title |
| 16 | `2n610036` | Etapa 15 (Video 3) | button, progress, script, title, video |
| 17 | `4n3k0627` | Etapa 16 | progress, quiz, title |
| 18 | `5m736x4h` | Etapa 17 | button, text, title |
| 19 | `334n1a6y` | Etapa 18 (Video 4) | button, progress, script, title, video |
| 20 | `162p2v0j` | PITCH | button, container, stopWatchTime, text, title, video |
| 21 | — | **Link** | `https://pay.hub.la/NvDVq8Sgr7Mo4eUvOoa3` |

Botões de etapas com vídeo têm atraso proposital (30s na Etapa 6, 115s na 9,
54s na 15, 35s na 13, 312s na 18) — é o funil original obrigando a assistir
antes de liberar o avanço. Use `?step=` para não esperar durante os testes.

## Teste A/B

O funil traz 4 variantes de primeira tela (o "hook"), que mudam mídia **e**
promessa:

| | Variante | Mídia | Ângulo |
|---|---|---|---|
| A | Hook V.1 Original | Foto | "20 minutos → R$2.500 a R$6.000/mês" |
| B | Hook V.2 GIF PIX | GIF | mesma promessa |
| C | Hook 3 | Vídeo | "Comece 2026 com grana — R$500 a R$2.000" |
| D | Hook 4 | Vídeo | mesma promessa |

No funil original só a **A** estava ligada; as outras existiam sem receber
tráfego. A divisão é editável em **/live → Teste A/B**, e o padrão é 100% na A.

> **Duas correções feitas no funil original:** a variante B tinha imagem e botão
> mas nenhuma ligação de saída — foi conectada à Etapa 1, espelhando a A. E o
> motor cai na Etapa 1 se alguma etapa ficar sem saída, para nenhuma variante
> prender o lead.

## Rastreamento

Eventos gravados em `funnel_events`:

| Evento | Quando |
|---|---|
| `page_loaded` | Primeira carga |
| `step_viewed` | Cada etapa exibida |
| `step_completed` | Avanço de etapa (com tempo gasto) |
| `quiz_answered` | Resposta escolhida, com o texto |
| `checkout_click` | Clique que leva ao checkout (com `keepalive`) |
| `backredirect_fired` | Tentativa de sair pelo "voltar" |

**Atribuição.** Na primeira visita são capturados `src`, `sck`, os cinco
`utm_*`, `fbclid`, `ttclid` e `gclid`. Ficam guardados pela sessão e são
reanexados no link do checkout — navegar para uma URL limpa não apaga a origem.
O painel atribui por *primeiro toque* e liga a venda à campanha pelo
`session_id`.

**Presença ao vivo.** Um canal de Realtime Presence publica em que etapa cada
sessão está. É estado efêmero, nada disso vai para o banco. Sai da etapa, some
do painel.

## Painel /live

Protegido por login do Supabase Auth. Sem Supabase configurado, abre direto em
modo demonstração.

| Aba | Conteúdo |
|---|---|
| Visão Geral | Receita, vendas, leads, conversão, saúde do funil |
| Funil | As 21 etapas com alcance, queda e presença ao vivo |
| Campanhas | Funil completo por origem |
| Criativos | Desempenho por `utm_content` / `utm_term` |
| Teste A/B | Divisão de tráfego editável + desempenho por variante |
| Vendas | Transações do webhook |
| Dispositivos | Aparelho, sistema e navegador (inclui in-app de Instagram/TikTok) |
| Auditoria | Trilha crua dos eventos, com tempo por etapa |

No topo, o **Mapa do Funil em Tempo Real**: um quadro por etapa, com quantas
sessões estão nela agora.

## Publicação

Todo `git push` na `main` reconstrói e republica via GitHub Actions
([deploy.yml](.github/workflows/deploy.yml)).

As variáveis de build ficam em **Settings → Secrets and variables → Actions →
Variables** (não em Secrets: são valores públicos que vão para o bundle).

O site roda em subpasta (`/quiz-ia-pro/`), o que exige `base` no Vite,
`basename` no router e `404.html` para as rotas do SPA — tudo já configurado.
Para domínio próprio, aponte o CNAME e ajuste `base` para `/`.

## Estrutura de arquivos

```
src/
  funnel.json          Conteúdo do funil (as 30 etapas e ligações)
  engine.ts            Navegação entre etapas
  Funnel.tsx           Renderiza a etapa atual
  blocks/              Um componente por tipo de bloco
  lib/
    tracking.ts        UTMs, click ids, sessão
    metrics.ts         Gravação de eventos
    pixels.ts          Meta, TikTok, GA/GTM
    abtest.ts          Sorteio de variante
    config.ts          Pesos do A/B (banco + cache local)
    backredirect.ts    Captura do botão "voltar"
    liveData.ts        Consultas e agregações do painel
    steps.ts           Rótulos e ícones das etapas
  hooks/
    usePresence.ts         Funil publica a etapa atual
    usePresenceObserver.ts Painel observa quem está onde
  pages/
    Live.tsx           Painel
    live/              Peças do painel
supabase/
  migrations/          Schema (eventos, vendas, config)
  functions/           Webhook do checkout
scripts/
  setup-supabase.sh    Aplica o schema num projeto
```
