// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
// ⚠️ TROCAR pelas credenciais do projeto Supabase do GUARDIÃO
// (Supabase Dashboard → Settings → API → Project URL + anon/public key)
const SUPABASE_URL = 'https://qegrzpgxsixypkfzcjxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlZ3J6cGd4c2l4eXBrZnpjanhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMzUzNjEsImV4cCI6MjA5NTgxMTM2MX0.2jqpP7yBAMBTmaLQcyk8SnT5nz6L01OsamRSAOLEApo';

(async function initTracker() {
  const PAGE_NAME  = window.__PAGE_NAME  || 'unknown';
  const PAGE_LABEL = window.__PAGE_LABEL || 'Desconhecida';

  // Guard: enquanto as credenciais forem placeholder, o tracker fica INATIVO
  // (não faz nenhuma requisição). Assim que trocar SUPABASE_URL/ANON_KEY, ativa.
  if (SUPABASE_URL.indexOf('SEU-PROJETO') !== -1 || SUPABASE_ANON_KEY.indexOf('COLE_AQUI') !== -1) {
    console.warn('[tracker] Supabase ainda não configurado — tracker inativo.');
    return;
  }

  // ── ANTI-BOT: não contabiliza crawlers/automação (só pessoas reais) ─────────
  // Ao anunciar/compartilhar, a Meta rasteja a URL de destino com
  // facebookexternalhit (preview de link) e meta-externalagent (crawler de IA),
  // gerando "acessos" fantasma. Também barra Google/Bing/social bots, ferramentas
  // headless (webdriver: Selenium/Puppeteer/Playwright), scripts (curl/python) e
  // UA vazio. `whatsapp\/` pega só o robô de preview do WhatsApp — o navegador
  // interno do WhatsApp NÃO tem esse token, então tráfego real da comunidade passa.
  var _ua = navigator.userAgent || '';
  var BOT_RE = /facebookexternalhit|meta-externalagent|facebookcatalog|facebot|bytespider|googlebot|google-inspectiontool|adsbot|storebot-google|apis-google|mediapartners-google|bingbot|bingpreview|yandex|baiduspider|duckduckbot|slackbot|twitterbot|linkedinbot|discordbot|telegrambot|whatsapp\/|applebot|petalbot|amazonbot|semrush|ahrefs|mj12bot|dotbot|dataforseo|screaming\s?frog|headlesschrome|phantomjs|puppeteer|playwright|lighthouse|gtmetrix|pingdom|uptimerobot|python-requests|python-httpx|axios|curl\/|\bwget\b|node-fetch|go-http-client|okhttp|java\/|libwww|\bbots?\b|crawler|spider|scrap/i;
  if (!_ua || BOT_RE.test(_ua) || navigator.webdriver === true) {
    console.warn('[tracker] bot/automação detectado — não contabilizando.');
    return;
  }

  // Marca o início da sessão (pra medir tempo na página / retenção)
  const pageStart = Date.now();

  // ── Session ID ─────────────────────────────────────────────────────────────
  function getSessionId() {
    let id = sessionStorage.getItem('_vsid');
    if (!id) {
      id = 'vs_' + Math.random().toString(36).substr(2, 9) + Date.now();
      sessionStorage.setItem('_vsid', id);
    }
    return id;
  }

  // ── Device detection ───────────────────────────────────────────────────────
  function getDeviceType() {
    return /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent) ? 'mobile' : 'desktop';
  }

  // ── URL params (UTMs + Google Ads click IDs) ──────────────────────────────
  // Persistência em 2 camadas:
  //   • sessionStorage (_v<key>)   → vida = aba aberta (passa entre páginas)
  //   • localStorage   (_lads_<k>) → vida = 30 dias (sobrevive close-aba/reload)
  // Captura: utm_* + gclid/gbraid/wbraid (Google Ads click IDs — gbraid/wbraid
  // surgiram com iOS 14 ATT pra atribuição quando GAID/IDFA está restrito).
  const ADS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
  const ADS_PERSISTENT_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','gbraid','wbraid'];

  function _setLocalAds(k, v) {
    try { localStorage.setItem('_lads_' + k, JSON.stringify({ v: v, ts: Date.now() })); } catch(e){}
  }
  function _getLocalAds(k) {
    try {
      const raw = localStorage.getItem('_lads_' + k);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || (Date.now() - obj.ts) > ADS_TTL_MS) {
        try { localStorage.removeItem('_lads_' + k); } catch(e){}
        return null;
      }
      return obj.v;
    } catch(e) { return null; }
  }

  // Hidrata localStorage a partir da URL atual (cada navegação que chega com UTM/gclid atualiza)
  (function hydrateFromUrl() {
    const p = new URLSearchParams(window.location.search);
    ADS_PERSISTENT_KEYS.forEach(k => {
      const v = p.get(k);
      if (v) _setLocalAds(k, v);
    });
  })();

  // Helper público pra outras páginas (buildCheckoutUrl etc) lerem qualquer param
  // priorizando URL atual > sessionStorage > localStorage(30d)
  window.getAdsParam = function(key) {
    try {
      const fromUrl = new URLSearchParams(location.search).get(key);
      if (fromUrl) return fromUrl;
      if (key.indexOf('utm_') === 0) {
        const ss = sessionStorage.getItem('_v' + key);
        if (ss) return ss;
      }
      return _getLocalAds(key);
    } catch(e) { return null; }
  };

  function getParams() {
    const p = new URLSearchParams(window.location.search);
    const fromUrl = {
      utm_source:   p.get('utm_source'),
      utm_medium:   p.get('utm_medium'),
      utm_campaign: p.get('utm_campaign'),
      utm_content:  p.get('utm_content'),
      utm_term:     p.get('utm_term'),
    };
    // Hidrata do sessionStorage > localStorage se a URL não tem
    const keys = Object.keys(fromUrl);
    keys.forEach(k => {
      if (!fromUrl[k]) {
        fromUrl[k] = sessionStorage.getItem('_v' + k) || _getLocalAds(k) || null;
      } else {
        sessionStorage.setItem('_v' + k, fromUrl[k]);
      }
    });

    // funnel_path (para distinguir path A vs B)
    const urlPath = p.get('path');
    const fp = urlPath || sessionStorage.getItem('_vfp') || null;
    if (fp) sessionStorage.setItem('_vfp', fp);

    return { ...fromUrl, funnel_path: fp };
  }

  const sessionId  = getSessionId();
  const deviceType = getDeviceType();
  const params     = getParams();

  // ── A/B variant — prioriza _ab_variant (genérico, qualquer label), com
  //    fallback pro legado _ab_quiz (A/B/C) usado no quiz Path B.
  function getAbVariant() {
    const v = sessionStorage.getItem('_ab_variant');
    if (v) return v;
    const legacy = sessionStorage.getItem('_ab_quiz');
    return (legacy === 'A' || legacy === 'B' || legacy === 'C') ? legacy : null;
  }

  // ── Headline variant (setado em vsl.html, sticky em sessionStorage) ────────
  function getHeadlineVariant() {
    const v = sessionStorage.getItem('_hl_variant');
    return v || null;
  }

  // ── Pattern Interrupt variant (setado em vsl.html, sticky) ─────────────────
  function getPiVariant() {
    const v = sessionStorage.getItem('_pi_variant');
    return v || null;
  }

  // ── VSL Lead variant (teste A/B — VSL_A=Panda atual, VSL_B=Vturb novo) ─────
  // Teste 2×2: 'VA' | 'VB' (braço de VSL). Valores antigos do funil de lead
  // continuam passando — a coluna é a mesma, só o vocabulário mudou.
  function getVslLeadVariant() {
    const v = sessionStorage.getItem('_vsl_lead');
    return v || null;
  }

  // ── Price variant (teste A/B — HUBLA_147 vs KIRVANO_147, sticky em vsl.html) ─
  // Aceita também os valores legados P_96/P_147/P_186 do teste anterior pra
  // manter retroatividade caso sessionStorage do usuário ainda esteja com
  // o variant antigo cacheado.
  function getPriceVariant() {
    const v = sessionStorage.getItem('_price_variant');
    // A67/B147/C297 = teste de preço atual (seg→sex); os demais são legados de testes antigos
    const valid = ['A67', 'B147', 'C297', /* encerrado 20/08, mantido p/ eventos em voo */ 'HUBLA_147', 'KIRVANO_147', 'P_96', 'P_147', 'P_186'];
    return valid.indexOf(v) > -1 ? v : null;
  }

  // ── Constrói o valor do parâmetro sck pra checkout Kirvano ────────────────
  // Formato: "VARIANT:SESSION_ID" quando temos variant, senão só "SESSION_ID".
  // O webhook lê cookies.sck e faz split — assim variant chega 100% mesmo
  // se pageview/click_events não tiverem ab_variant gravado.
  // Exemplo: sck=VSL_OLD:vs_abc123xyz
  function buildSckParam() {
    const sid = getSessionId();
    if (!sid) return '';
    const variant = getAbVariant();
    return variant ? (variant + ':' + sid) : sid;
  }
  window.buildSckParam = buildSckParam;

  // ── Load Supabase SDK ──────────────────────────────────────────────────────
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const { createClient } = window.supabase;
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Expõe tracker para quiz e retention usar ───────────────────────────────
  window.__tracker = { db, sessionId, params, deviceType };

  // ── Helper para compor body com todas as UTMs + ab_variant + headline_variant ─
  function utmPayload() {
    const cur = getParams(); // re-lê toda vez (caso UTMs tenham sido hidratadas após init)
    return {
      utm_source:       cur.utm_source,
      utm_medium:       cur.utm_medium,
      utm_campaign:     cur.utm_campaign,
      utm_content:      cur.utm_content,
      utm_term:         cur.utm_term,
      funnel_path:      cur.funnel_path,
      ab_variant:        getAbVariant(),
      headline_variant:  getHeadlineVariant(),
      pi_variant:        getPiVariant(),
      vsl_lead_variant:  getVslLeadVariant(),
      price_variant:     getPriceVariant(),
    };
  }

  // ── Tracking de cliques (keepalive: sobrevive à navegação) ────────────────
  // Aceita payload extra como 2º arg (ex: { time_on_page_ms: 12345 })
  window.trackClick = function(label, extra) {
    const u = utmPayload();
    fetch(SUPABASE_URL + '/rest/v1/click_events', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        session_id:  sessionId,
        page:        PAGE_NAME,
        click_label: label,
        device_type: deviceType,
        event_time:  new Date().toISOString(),
        ...u,
        ...(extra || {}),
      }),
      keepalive: true,
    }).catch(function() {});
  };

  // ── Tracking de retention milestones (UNIQUE constraint evita duplicata) ──
  // `on_conflict` na URL + `resolution=ignore-duplicates` no Prefer fazem
  // PostgREST tratar duplicata como no-op (200) em vez de 409. Sem o
  // on_conflict explícito, o PostgREST não sabe qual UNIQUE constraint
  // resolver e devolve 409 mesmo com o Prefer.
  window.trackRetention = function(page, milestoneSeconds) {
    const u = utmPayload();
    fetch(SUPABASE_URL + '/rest/v1/video_retention_events?on_conflict=session_id,page,milestone_seconds', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer':        'return=minimal,resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        session_id:        sessionId,
        page:              page || PAGE_NAME,
        milestone_seconds: milestoneSeconds,
        device_type:       deviceType,
        event_time:        new Date().toISOString(),
        ...u,
      }),
      keepalive: true,
    }).catch(function() {});
  };

  // ── 1. Registrar pageview (histórico permanente) ───────────────────────────
  async function logPageview() {
    try {
      const u = utmPayload();
      await db.from('pageview_events').insert({
        session_id:  sessionId,
        page:        PAGE_NAME,
        page_label:  PAGE_LABEL,
        event_time:  new Date().toISOString(),
        user_agent:  navigator.userAgent.substring(0, 200),
        referrer:    document.referrer.substring(0, 200),
        device_type: deviceType,
        ...u,
      });
    } catch(e) {
      // Se alguma coluna nova ainda não existe no banco, retenta sem ela
      if (e && e.message && /(ab_variant|headline_variant|pi_variant|vsl_lead_variant|price_variant)/i.test(e.message)) {
        try {
          const u = utmPayload();
          delete u.ab_variant;
          delete u.headline_variant;
          delete u.pi_variant;
          delete u.vsl_lead_variant;
          delete u.price_variant;
          await db.from('pageview_events').insert({
            session_id: sessionId, page: PAGE_NAME, page_label: PAGE_LABEL,
            event_time: new Date().toISOString(),
            user_agent: navigator.userAgent.substring(0, 200),
            referrer:   document.referrer.substring(0, 200),
            device_type: deviceType,
            ...u,
          });
        } catch(_) {}
      }
    }
  }

  // ── 2. Heartbeat (quem está online agora) ─────────────────────────────────
  async function heartbeat() {
    try {
      const qs = window.__quiz_step || {};
      await db.from('online_visitors').upsert({
        session_id:      sessionId,
        page:            PAGE_NAME,
        page_label:      PAGE_LABEL,
        last_seen:       new Date().toISOString(),
        user_agent:      navigator.userAgent.substring(0, 200),
        referrer:        document.referrer.substring(0, 200),
        quiz_step:       (qs.num !== undefined && qs.num !== null) ? qs.num : null,
        quiz_step_label: qs.label || null,
      }, { onConflict: 'session_id' });
    } catch(e) { /* silently fail */ }
  }

  async function cleanup() {
    try {
      await db.from('online_visitors').delete().eq('session_id', sessionId);
    } catch(e) {}
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  // Anti-bot: só registra pageview se a sessão durar pelo menos 2 segundos.
  // Bots do Meta carregam e somem em < 1s — 2s já filtra >95% deles.
  // Antes era 5s mas estávamos perdendo humanos legítimos que saíam em 2-4s
  // (mobile lento, scroll rápido). Calibração 11/05/2026.
  const PV_DELAY_MS = 2000;
  let pvTimeout = setTimeout(logPageview, PV_DELAY_MS);
  // Se o user fechar/sair antes de 5s, cancela o pageview (era bot ou desistente).
  function cancelPvIfHidden() {
    if (document.visibilityState === 'hidden' && pvTimeout) {
      clearTimeout(pvTimeout); pvTimeout = null;
    }
  }
  document.addEventListener('visibilitychange', cancelPvIfHidden);
  window.addEventListener('pagehide', cancelPvIfHidden);

  await heartbeat();

  // ── Heartbeat sticky com proteção anti-leak ────────────────────────────────
  // Em sessões longas com várias alternâncias de aba, a versão anterior
  // criava setInterval novo a cada visible sem guardar referência → leak.
  // Agora `interval` é mutável e sempre limpamos antes de recriar.
  let interval = setInterval(heartbeat, 30000);

  function stopHeartbeat() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function startHeartbeat() {
    if (interval) return; // já rodando — não duplica
    heartbeat();
    interval = setInterval(heartbeat, 30000);
  }

  // ── Tempo na página: envia a duração total ao sair (keepalive sobrevive) ────
  let exitSent = false;
  function sendExit() {
    if (exitSent) return; exitSent = true;
    if (typeof window.trackClick === 'function') {
      window.trackClick(PAGE_NAME + '_exit', { time_on_page_ms: Date.now() - pageStart });
    }
  }
  window.addEventListener('pagehide', sendExit);

  window.addEventListener('beforeunload', () => {
    sendExit();
    stopHeartbeat();
    cleanup();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopHeartbeat();
    } else {
      startHeartbeat();
    }
  });
})();
