(function () {
  'use strict';

  function zar(n) {
    return 'R' + Number(n).toLocaleString('en-ZA');
  }

  function cardHtml(tpl) {
    var features = (tpl.features || []).map(function (f) {
      return '<li>' + f + '</li>';
    }).join('');
    var demoHref = tpl.demo ? ('/demos/' + tpl.id + '/') : 'contact.html';
    var demoLabel = tpl.demo ? 'Live Demo' : 'Request demo';
    var demoTarget = tpl.demo ? ' target="_blank" rel="noopener noreferrer"' : '';

    return (
      '<article class="template-card" data-category="' + tpl.category + '" data-name="' + tpl.industry + '" data-id="' + tpl.id + '">' +
        '<a class="template-preview-link" href="customise.html?id=' + encodeURIComponent(tpl.id) + '">' +
          '<div class="template-preview has-image">' +
            '<img src="' + tpl.thumbnail + '" alt="' + tpl.name + ' preview" loading="lazy" width="640" height="400">' +
          '</div>' +
        '</a>' +
        '<div class="template-body">' +
          '<p class="template-industry">' + tpl.industry + '</p>' +
          '<h3>' + tpl.name + '</h3>' +
          '<p class="template-summary">' + tpl.summary + '</p>' +
          '<p class="template-price">' + zar(tpl.price) + ' <span>from</span></p>' +
          '<ul class="template-features">' + features + '</ul>' +
          '<div class="template-actions">' +
            '<a class="btn btn-secondary btn-sm" href="' + demoHref + '"' + demoTarget + '>' + demoLabel + '</a>' +
            '<a class="btn btn-primary btn-sm" href="customise.html?id=' + encodeURIComponent(tpl.id) + '">Customise</a>' +
            '<a class="text-link" href="checkout.html?id=' + encodeURIComponent(tpl.id) + '">Purchase</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function initFilters() {
    var searchInput = document.getElementById('templateSearch');
    var filterButtons = document.querySelectorAll('#templateFilters .filter-chip');
    var templateCards = document.querySelectorAll('#templatesGrid .template-card');
    var templatesEmpty = document.getElementById('templatesEmpty');
    var activeFilter = 'all';

    function filterTemplates() {
      var query = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();
      var visible = 0;
      templateCards.forEach(function (card) {
        var category = card.getAttribute('data-category') || '';
        var name = (card.getAttribute('data-name') || '').toLowerCase();
        var titleEl = card.querySelector('h3');
        var title = titleEl ? titleEl.textContent.toLowerCase() : '';
        var matchFilter = activeFilter === 'all' || category === activeFilter;
        var matchQuery = !query || name.indexOf(query) !== -1 || title.indexOf(query) !== -1 || category.indexOf(query) !== -1;
        var show = matchFilter && matchQuery;
        card.hidden = !show;
        if (show) visible += 1;
      });
      if (templatesEmpty) templatesEmpty.hidden = visible > 0;
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeFilter = btn.getAttribute('data-filter') || 'all';
        filterButtons.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        filterTemplates();
      });
    });
    if (searchInput) searchInput.addEventListener('input', filterTemplates);
  }

  function render() {
    var grid = document.getElementById('templatesGrid');
    if (!grid) return;
    var list = window.DDM_TEMPLATES || [];
    grid.innerHTML = list.map(cardHtml).join('');
    initFilters();
  }

  if (window.DDM_TEMPLATES) render();
  else window.addEventListener('ddm-templates-ready', render);
})();
