/* Tab demo produk */
(function () {
  'use strict';
  var tabs = ['dashboard', 'siswa', 'jadwal', 'laporan', 'setting'];
  var current = 'dashboard', busy = false;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var urlEl = document.getElementById('showcaseUrl');
  if (!urlEl) return;

  function sync(key) {
    tabs.forEach(function (k) {
      var b = document.getElementById('tabbtn-' + k);
      b.classList.toggle('active', k === key);
      b.setAttribute('aria-selected', k === key);
    });
  }

  function show(key) {
    if (busy || key === current) return;
    var oldEl = document.getElementById('view-' + current);
    var newEl = document.getElementById('view-' + key);
    sync(key);
    if (reduced) {
      oldEl.classList.remove('active'); newEl.classList.add('active');
      urlEl.textContent = 'app.piketku.id/' + key; current = key; return;
    }
    busy = true;
    urlEl.classList.add('url-fade');
    oldEl.classList.remove('active'); oldEl.classList.add('leaving');
    setTimeout(function () {
      oldEl.classList.remove('leaving');
      urlEl.textContent = 'app.piketku.id/' + key;
      urlEl.classList.remove('url-fade');
      newEl.classList.add('active', 'entering');
      setTimeout(function () { newEl.classList.remove('entering'); busy = false; }, 500);
    }, 220);
    current = key;
  }

  sync(current);
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]');
    if (b) show(b.dataset.tab);
  });
})();
