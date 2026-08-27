(function () {
  'use strict';

  function zar(n) {
    return 'R' + Number(n).toLocaleString('en-ZA');
  }

  function getTemplate(id) {
    return (window.DDM_TEMPLATES || []).find(function (t) { return t.id === id; });
  }

  function submitPayfastForm(action, fields) {
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    Object.keys(fields).forEach(function (key) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = fields[key];
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  function boot() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var tpl = getTemplate(id);
    if (!tpl) {
      window.location.href = 'templates.html';
      return;
    }

    if (params.get('cancelled') === '1') {
      var note = document.getElementById('cancelNote');
      if (note) note.hidden = false;
    }

    var draft = {};
    try {
      draft = JSON.parse(localStorage.getItem('ddm-checkout-draft') || '{}') || {};
    } catch (e) {
      draft = {};
    }
    if (draft.templateId && draft.templateId !== tpl.id) {
      try {
        draft = JSON.parse(localStorage.getItem('ddm-template-draft:' + tpl.id) || '{}') || {};
      } catch (e2) {
        draft = {};
      }
    }

    var mode = draft.mode === 'customise' || draft.mode === 'hosting' ? draft.mode : 'purchase';
    var amount = tpl.price;
    if (mode === 'customise') amount = tpl.customisePrice;
    if (mode === 'hosting') amount = tpl.hostingPrice || 1999;

    document.getElementById('summaryThumb').src = tpl.thumbnail;
    document.getElementById('summaryThumb').alt = tpl.name;
    document.getElementById('summaryIndustry').textContent = tpl.industry;
    document.getElementById('summaryName').textContent = tpl.name;
    document.getElementById('summaryMode').textContent =
      mode === 'hosting'
        ? 'Full website hosting & revamp'
        : mode === 'customise'
          ? 'Customised build + launch support'
          : 'Template license only';
    document.getElementById('summaryPrice').textContent = zar(amount);

    var customList = document.getElementById('summaryCustom');
    customList.innerHTML = '';
    [
      ['Business', draft.bizName],
      ['Tagline', draft.tagline],
      ['Headline', draft.headline],
      ['CTA', draft.ctaLabel],
      ['Primary', draft.primaryColor],
      ['Accent', draft.accentColor],
      ['Font', draft.fontFamily],
      ['Phone', draft.phone],
      ['Email', draft.email],
      ['WhatsApp', draft.whatsapp],
      ['Address', draft.address],
      ['Menu', draft.navLabels],
      ['Notes', draft.notes]
    ].forEach(function (row) {
      if (!row[1]) return;
      var li = document.createElement('li');
      li.innerHTML = '<strong>' + row[0] + ':</strong> ' + String(row[1]).replace(/</g, '&lt;');
      customList.appendChild(li);
    });

    var form = document.getElementById('checkoutForm');
    var status = document.getElementById('checkoutStatus');
    var btn = document.getElementById('payBtn');
    var errEmail = document.getElementById('err-pay-email');

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      errEmail.textContent = '';
      status.className = '';
      status.style.display = 'none';

      var email = document.getElementById('payEmail').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEmail.textContent = 'Enter a valid email for your PayFast receipt.';
        return;
      }

      var customNotes = [
        draft.bizName && ('Business: ' + draft.bizName),
        draft.tagline && ('Tagline: ' + draft.tagline),
        draft.primaryColor && ('Primary: ' + draft.primaryColor),
        draft.accentColor && ('Accent: ' + draft.accentColor),
        draft.notes
      ].filter(Boolean).join(' | ').slice(0, 255);

      btn.disabled = true;
      btn.textContent = 'Redirecting to PayFast…';

      try {
        var res = await fetch('/api/payfast/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            templateId: tpl.id,
            mode: mode,
            email: email,
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            phone: document.getElementById('payPhone').value.trim(),
            customNotes: customNotes
          })
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || 'Could not start PayFast checkout');
        submitPayfastForm(data.action, data.fields);
      } catch (err) {
        status.className = 'error';
        status.style.display = 'block';
        status.textContent = err.message + '. Start the site with npm run site so PayFast signing works.';
        btn.disabled = false;
        btn.textContent = 'Pay with PayFast';
      }
    });
  }

  if (window.DDM_TEMPLATES) boot();
  else window.addEventListener('ddm-templates-ready', boot);
})();
