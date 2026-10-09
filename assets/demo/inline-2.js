(function () {
  /* Intro pembukaan pertama: tampil sekali per perangkat, tap untuk lewati */
  var intro = document.getElementById('pkIntro');
  if (!intro) return;
  var KEY = 'piketku_intro_seen';
  var seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (seen) { intro.remove(); return; }
  document.documentElement.style.overflow = 'hidden';
  var closed = false;
  function closeIntro() {
    if (closed) return;
    closed = true;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    intro.classList.add('hide');
    document.documentElement.style.overflow = '';
    setTimeout(function () { intro.remove(); }, 800);
  }
  intro.addEventListener('click', closeIntro);
  setTimeout(closeIntro, 2900);
})();
