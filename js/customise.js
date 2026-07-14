(function () {
  'use strict';

  function zar(n) {
    return 'R' + Number(n).toLocaleString('en-ZA');
  }

  function getTemplate(id) {
    return (window.DDM_TEMPLATES || []).find(function (t) { return t.id === id; });
  }

  function val(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked;
    return el.value;
  }

  function boot() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var tpl = getTemplate(id);
    if (!tpl) {
      window.location.href = 'templates.html';
      return;
    }

    var draftKey = 'ddm-template-draft:' + tpl.id;
    var draft = {};
    try { draft = JSON.parse(localStorage.getItem(draftKey) || '{}') || {}; } catch (e) { draft = {}; }

    document.getElementById('tplTitle').textContent = 'Customise · ' + tpl.name;
    document.getElementById('tplLead').textContent = tpl.summary + ' — from ' + zar(tpl.price) + '.';
    document.getElementById('pricePurchase').textContent = zar(tpl.price);
    document.getElementById('priceHosting').textContent = zar(tpl.hostingPrice || 1999);
    document.getElementById('priceCustomise').textContent = zar(tpl.customisePrice);

    var fields = {
      bizName: draft.bizName || tpl.name,
      tagline: draft.tagline || tpl.summary.slice(0, 80),
      primaryColor: draft.primaryColor || '#0a0a0a',
      accentColor: draft.accentColor || '#2563eb',
      bgColor: draft.bgColor || '#ffffff',
      textColor: draft.textColor || '#111111',
      fontFamily: draft.fontFamily || 'Inter, system-ui, sans-serif',
      headline: draft.headline || ('Welcome to ' + tpl.name),
      subtext: draft.subtext || tpl.summary,
      ctaLabel: draft.ctaLabel || 'Get in touch',
      aboutText: draft.aboutText || ('We help customers through ' + tpl.industry.toLowerCase() + ' with a premium online presence.'),
      phone: draft.phone || '',
      email: draft.email || '',
      whatsapp: draft.whatsapp || '',
      address: draft.address || '',
      facebook: draft.facebook || '',
      instagram: draft.instagram || '',
      navLabels: draft.navLabels || 'Home, Services, About, Contact',
      showHeader: draft.showHeader !== false,
      showHero: draft.showHero !== false,
      showServices: draft.showServices !== false,
      showAbout: draft.showAbout !== false,
      showContact: draft.showContact !== false,
      showFooter: draft.showFooter !== false,
      notes: draft.notes || '',
      logoDataUrl: draft.logoDataUrl || '',
      mode: draft.mode || 'purchase'
    };

    Object.keys(fields).forEach(function (key) {
      var el = document.getElementById(key);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!fields[key];
      else if (key !== 'logoDataUrl') el.value = fields[key];
    });
    if (fields.mode === 'customise' || fields.mode === 'hosting') {
      var radio = document.querySelector('input[name="mode"][value="' + fields.mode + '"]');
      if (radio) radio.checked = true;
    }

    var liveDemoBtn = document.getElementById('liveDemoBtn');
    var demoFrame = document.getElementById('demoFrame');
    var demoFallback = document.getElementById('demoFallback');
    var demoReady = false;

    liveDemoBtn.href = tpl.demo ? ('/demos/' + tpl.id + '/') : 'contact.html';
    if (!tpl.demo) {
      liveDemoBtn.textContent = 'Request demo';
      liveDemoBtn.removeAttribute('target');
      demoFallback.hidden = false;
    } else {
      demoFrame.src = '/demos/' + tpl.id + '/';
      demoFallback.hidden = true;
    }

    function collect() {
      var modeEl = document.querySelector('input[name="mode"]:checked');
      return {
        templateId: tpl.id,
        bizName: val('bizName').trim(),
        tagline: val('tagline').trim(),
        primaryColor: val('primaryColor'),
        accentColor: val('accentColor'),
        bgColor: val('bgColor'),
        textColor: val('textColor'),
        fontFamily: val('fontFamily'),
        headline: val('headline').trim(),
        subtext: val('subtext').trim(),
        ctaLabel: val('ctaLabel').trim(),
        aboutText: val('aboutText').trim(),
        phone: val('phone').trim(),
        email: val('email').trim(),
        whatsapp: val('whatsapp').trim(),
        address: val('address').trim(),
        facebook: val('facebook').trim(),
        instagram: val('instagram').trim(),
        navLabels: val('navLabels').trim(),
        showHeader: !!document.getElementById('showHeader').checked,
        showHero: !!document.getElementById('showHero').checked,
        showServices: !!document.getElementById('showServices').checked,
        showAbout: !!document.getElementById('showAbout').checked,
        showContact: !!document.getElementById('showContact').checked,
        showFooter: !!document.getElementById('showFooter').checked,
        notes: val('notes').trim(),
        logoDataUrl: fields.logoDataUrl || '',
        mode: modeEl ? modeEl.value : 'purchase'
      };
    }

    function pushToIframe(theme) {
      if (!tpl.demo || !demoFrame.contentWindow) return;
      try {
        demoFrame.contentWindow.postMessage({ type: 'ddm-theme', theme: theme }, '*');
      } catch (e) {}
    }

    function pushWithRetries(theme) {
      pushToIframe(theme);
      [300, 800, 1600, 2800].forEach(function (ms) {
        setTimeout(function () { pushToIframe(theme); }, ms);
      });
    }

    function updateMock(payload) {
      document.getElementById('mockName').textContent = payload.bizName || tpl.name;
      document.getElementById('mockTag').textContent = payload.tagline || '';
      document.getElementById('mockHeadline').textContent = payload.headline || '';
      document.getElementById('mockSubtext').textContent = payload.subtext || '';
      document.getElementById('mockCta').textContent = payload.ctaLabel || 'Get in touch';
      document.getElementById('mockCta').style.background = payload.accentColor;
      document.getElementById('mockAboutText').textContent = payload.aboutText || '';
      document.getElementById('mockNav').textContent = (payload.navLabels || '').replace(/\s*,\s*/g, ' · ');
      document.getElementById('mockUrl').textContent = (payload.bizName || 'yourbusiness').toLowerCase().replace(/[^a-z0-9]+/g, '') + '.co.za';
      document.getElementById('mockMeta').textContent = [payload.phone, payload.email, payload.address].filter(Boolean).join(' · ') || 'Add contact details';
      document.getElementById('mockFooter').textContent = '© ' + (payload.bizName || 'Your business');

      var body = document.getElementById('mockBody');
      body.style.setProperty('--mock-primary', payload.primaryColor);
      body.style.setProperty('--mock-accent', payload.accentColor);
      body.style.background = payload.bgColor;
      body.style.color = payload.textColor;
      body.style.fontFamily = payload.fontFamily;

      document.getElementById('mockHeader').hidden = !payload.showHeader;
      document.getElementById('mockHero').hidden = !payload.showHero;
      document.getElementById('mockAbout').hidden = !payload.showAbout;
      document.getElementById('mockMeta').hidden = !payload.showContact;
      document.getElementById('mockFooter').hidden = !payload.showFooter;

      var logo = document.getElementById('mockLogo');
      if (payload.logoDataUrl) {
        logo.src = payload.logoDataUrl;
        logo.hidden = false;
      } else {
        logo.hidden = true;
        logo.removeAttribute('src');
      }

      var thumb = document.getElementById('mockThumb');
      thumb.src = tpl.thumbnail;
      thumb.alt = tpl.name + ' preview';
    }

    function saveDraft() {
      var payload = collect();
      fields.logoDataUrl = payload.logoDataUrl;
      localStorage.setItem(draftKey, JSON.stringify(payload));
      localStorage.setItem('ddm-checkout-draft', JSON.stringify(payload));
      updateMock(payload);
      pushWithRetries(payload);
      var status = document.getElementById('previewEditStatus');
      if (status) status.textContent = 'Showing your edits in live preview';
      return payload;
    }

    document.getElementById('logoFile').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        fields.logoDataUrl = String(reader.result || '');
        saveDraft();
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('clearLogo').addEventListener('click', function () {
      fields.logoDataUrl = '';
      document.getElementById('logoFile').value = '';
      saveDraft();
    });

    document.querySelectorAll('#customiseForm input, #customiseForm select, #customiseForm textarea').forEach(function (el) {
      el.addEventListener('input', saveDraft);
      el.addEventListener('change', saveDraft);
    });

    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'ddm-demo-ready') {
        demoReady = true;
        pushWithRetries(collect());
      }
    });
    demoFrame.addEventListener('load', function () {
      pushWithRetries(collect());
    });

    document.getElementById('tabDemo').addEventListener('click', function () {
      document.getElementById('previewDemoWrap').hidden = false;
      document.getElementById('previewMockWrap').hidden = true;
      document.getElementById('tabDemo').classList.add('is-active');
      document.getElementById('tabMock').classList.remove('is-active');
      pushWithRetries(collect());
    });
    document.getElementById('tabMock').addEventListener('click', function () {
      document.getElementById('previewDemoWrap').hidden = true;
      document.getElementById('previewMockWrap').hidden = false;
      document.getElementById('tabMock').classList.add('is-active');
      document.getElementById('tabDemo').classList.remove('is-active');
    });

    document.getElementById('customiseForm').addEventListener('submit', function (e) {
      e.preventDefault();
      saveDraft();
      window.location.href = 'checkout.html?id=' + encodeURIComponent(tpl.id);
    });

    saveDraft();
  }

  if (window.DDM_TEMPLATES) boot();
  else window.addEventListener('ddm-templates-ready', boot);
})();
