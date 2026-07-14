window.DDM_TEMPLATES = undefined;
fetch('js/templates.json')
  .then(function (r) { return r.json(); })
  .then(function (data) {
    window.DDM_TEMPLATES = data;
    window.dispatchEvent(new Event('ddm-templates-ready'));
  })
  .catch(function () {
    console.error('Failed to load templates.json');
    window.DDM_TEMPLATES = [];
    window.dispatchEvent(new Event('ddm-templates-ready'));
  });
