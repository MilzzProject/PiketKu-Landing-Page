/* Dijalankan sebelum render agar tidak ada kilatan tema. Ukuran sangat kecil. */
(function () {
  var d = document.documentElement, t = null;
  d.classList.remove('no-js');
  try { t = localStorage.getItem('piketku-theme'); } catch (e) {}
  if (!t && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) t = 'dark';
  d.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
})();
