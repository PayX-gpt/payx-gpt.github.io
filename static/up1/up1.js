(function () {
  'use strict';

  // ============================================================
  // CONFIG — cole aqui as URLs de one-click upsell (Kirvano/Hotmart)
  // e a URL de quem recusa (área de membros / obrigado)
  // ============================================================
  // Links one-click (terminam em /upsell: cobram o cartão do pedido anterior).
  const URLS = {
    essencial: 'https://pay.hub.la/nyg6tWYBr76YS9CbvSza/upsell',   // PRO Essencial R$197
    avancado:  'https://pay.hub.la/dW7OpZecxWNh1EPsS99R/upsell',   // PRO Avançado R$297
    max:       'https://pay.hub.la/uGM1C446y9fsBHJOvOD/upsell',    // PRO MAX R$347
    decline:   '/down1'    // ← downsell 1 (PRO Avançado por R$147, 50% off)
  };

  // Links anteriores, caso precise reverter rápido:
  //   essencial: https://pay.hub.la/0Q0sJiaw24VHo5JzX2om/upsell
  //   avancado:  https://pay.hub.la/WM335591gfmehhF8A8pZ/upsell
  //   max:       https://pay.hub.la/C9uGXNAz6K9yCHNN8EnK/upsell

  const $ = function (sel) { return document.querySelector(sel); };

  // aplica URLs nos botões
  document.querySelectorAll('.plan-btn').forEach(function (btn) {
    var plan = btn.getAttribute('data-plan');
    if (URLS[plan] && URLS[plan] !== '#') btn.setAttribute('href', URLS[plan]);
  });
  var decline = $('#btn-decline');
  if (URLS.decline !== '#') decline.setAttribute('href', URLS.decline);

  // progress inicial
  setTimeout(function () { $('#progress-bar').style.width = '35%'; }, 200);

  // ============================================================
  // STAGE 1 → STAGE 2 (análise) → STAGE 3 (planos)
  // ============================================================
  $('#btn-reveal').addEventListener('click', function () {
    $('#stage-1').classList.add('hidden');
    $('#stage-2').classList.remove('hidden');
    $('#progress-bar').style.width = '65%';
    window.scrollTo(0, 0);
    runAnalysis();
  });

  function runAnalysis() {
    var steps = document.querySelectorAll('.analyze li');
    var delays = [600, 1300, 2100, 3000]; // quando cada check completa
    steps.forEach(function (li, i) {
      setTimeout(function () { li.classList.add('done'); }, delays[i]);
    });
    // após o último check, revela os planos
    setTimeout(function () {
      $('#stage-2').classList.add('hidden');
      $('#stage-3').classList.remove('hidden');
      $('#progress-bar').style.width = '100%';
      window.scrollTo(0, 0);
      // dispara evento (útil pra pixel)
      window.dispatchEvent(new CustomEvent('guardiao:up1_planos'));
      if (typeof fbq === 'function') {
        try { fbq('track', 'ViewContent', { content_name: 'UP1_GUARDIAO_PRO' }); } catch (e) {}
      }
    }, 3800);
  }

  // backdoor de teste — pula direto pros planos
  window.__up1Planos = function () {
    $('#stage-1').classList.add('hidden');
    $('#stage-2').classList.add('hidden');
    $('#stage-3').classList.remove('hidden');
    $('#progress-bar').style.width = '100%';
  };

})();
