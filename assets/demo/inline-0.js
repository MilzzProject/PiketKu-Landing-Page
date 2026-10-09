/* Intro: tandai pengguna lama sebelum CSS dimuat agar intro tidak berkedip */
  try { if (localStorage.getItem('piketku_intro_seen') === '1') document.documentElement.classList.add('intro-seen'); } catch (e) {}
