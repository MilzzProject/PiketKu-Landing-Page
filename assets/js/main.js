/* PiketKu landing — perilaku inti: tema, menu mobile, navbar, reveal, hitung angka */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setIcon(el, name) {
    var use = el && el.querySelector('use');
    if (use) use.setAttribute('href', '#i-' + name);
  }

  // ---- Tema ----
  function syncThemeIcons() {
    var dark = root.getAttribute('data-theme') === 'dark';
    setIcon(document.getElementById('themeIconDesktop'), dark ? 'sun' : 'moon');
    setIcon(document.getElementById('themeIconMobile'), dark ? 'sun' : 'moon');
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.content = dark ? 'dark' : 'light';
  }
  function toggleTheme() {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('piketku-theme', next); } catch (e) {}
    syncThemeIcons();
  }

  // ---- Menu mobile ----
  var menu = document.getElementById('mobileMenu');
  var menuBtn = document.getElementById('menuBtn');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    setIcon(document.getElementById('mobileMenuIcon'), open ? 'x' : 'menu');
  }
  function toggleMenu() { setMenu(!menu.classList.contains('open')); }

  // Satu listener untuk semua aksi (event delegation)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-action]');
    if (a) {
      if (a.dataset.action === 'theme') toggleTheme();
      else if (a.dataset.action === 'menu') toggleMenu();
      return;
    }
    // tutup menu saat tautan anchor di dalamnya diklik
    if (menu.classList.contains('open') && e.target.closest('#mobileMenu a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });
  matchMedia('(min-width:1024px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  syncThemeIcons();

  // ---- Navbar saat scroll (1 class, di-throttle via rAF) ----
  var navbar = document.getElementById('navbar'), ticking = false;
  function onScroll() {
    ticking = false;
    navbar.classList.toggle('scrolled', window.scrollY > 12);
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // ---- Reveal saat masuk viewport ----
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in-view'); });
  }

  // ---- Tilt 3D hero (hanya perangkat dengan mouse) ----
  var card = document.getElementById('heroTiltCard');
  if (card && !reduced && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var raf = 0;
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var ry = ((e.clientX - r.left) / r.width - 0.5) * 14;
      var rx = (0.5 - (e.clientY - r.top) / r.height) * 14;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        card.style.transform = 'perspective(1200px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(1.02)';
      });
    });
    card.addEventListener('mouseleave', function () {
      cancelAnimationFrame(raf);
      card.style.transform = '';
    });
  }

  // ---- Hitung angka hero ----
  document.querySelectorAll('.cnt-hero').forEach(function (el) {
    var to = parseInt(el.dataset.to, 10);
    if (reduced) { el.textContent = to; return; }
    var t0 = performance.now();
    (function step(t) {
      var p = Math.min(1, (t - t0) / 1200);
      el.textContent = Math.round(p * to);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  });

  // ---- Tahun footer ----
  var y = document.getElementById('footerYear');
  if (y) y.innerHTML = '&copy; ' + new Date().getFullYear() + ' PiketKu. Seluruh hak cipta dilindungi.';
})();
