# payx-gpt.github.io

Site raiz — reúne o funil e as páginas de upsell num endereço só, com
caminhos curtos.

| Endereço | O que é | Fonte |
|---|---|---|
| `/` | Funil do quiz IA PRO | [`front/`](front) |
| `/live` | Painel de métricas do funil | [`front/src/pages/Live.tsx`](front/src/pages/Live.tsx) |
| `/up1/` | Upsell GUARDIÃO PRO | [`static/up1/`](static/up1) |
| `/down1/` | Downsell de recusa | [`static/down1/`](static/down1) |

## Como funciona a publicação

Todo `push` na `main` dispara o [workflow](.github/workflows/deploy.yml), que:

1. constrói o funil (Vite) a partir de `front/`;
2. copia o resultado para a raiz do site;
3. copia `static/` ao lado, preservando os caminhos das páginas de upsell.

As variáveis de build ficam em **Settings → Secrets and variables → Actions →
Variables**. São valores públicos (vão para o bundle do navegador), por isso
Variables e não Secrets.

## Rodar localmente

O funil:

```bash
cd front
npm install
npm run dev
```

As páginas estáticas não têm build — abra `static/up1/index.html` direto, ou
sirva a pasta:

```bash
cd static && python3 -m http.server 8000   # http://localhost:8000/up1/
```

## Estrutura

```
front/     Funil do quiz (Vite + React). Veja front/README.md.
static/    Páginas servidas como estão
  up1/       Upsell — index.html, up1.css, up1.js
  down1/     Downsell (reaproveita o CSS do up1)
  assets/    Logo e fotos dos depoimentos
  tracker.js Rastreamento de páginas do upsell
```

## Rastreamento — dois sistemas separados

Vale saber, porque hoje **não é um painel só**:

- **O funil** grava em `funnel_events` no Supabase configurado em
  `VITE_SUPABASE_URL`, e alimenta o `/live`.
- **O upsell** usa `static/tracker.js`, que aponta para um **projeto Supabase
  diferente** (o do GUARDIÃO) e grava com outro formato.

Para as páginas de upsell aparecerem no `/live`, elas precisam apontar para o
mesmo projeto e emitir os mesmos eventos.

## Observação sobre o `down1`

O botão de recusa dele leva para `/down2`, que ainda não foi clonado — o link
aponta para o domínio original (`vsl.blackboxmembers.com.br/down2/`) para a
cadeia não quebrar.
