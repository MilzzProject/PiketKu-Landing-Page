/* Akordeon FAQ */
(function () {
  'use strict';
  var open = 0;
  function set(i, on) {
    var a = document.getElementById('faq-ans-' + i), c = document.getElementById('faq-chev-' + i);
    var b = document.querySelector('[data-faq="' + i + '"]');
    if (!a) return;
    a.classList.toggle('open', on); c.classList.toggle('open', on);
    b.setAttribute('aria-expanded', on);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-faq]');
    if (!b) return;
    var i = +b.dataset.faq, was = open === i;
    if (open !== -1) set(open, false);
    open = was ? -1 : i;
    if (open !== -1) set(open, true);
  });
})();
