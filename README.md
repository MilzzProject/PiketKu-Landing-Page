# PiketKu Landing Page

Landing page mobile-first. Buka `index.html` (disarankan lewat server lokal/hosting statis).

```
index.html            halaman utama (HTML saja, ±70 KB mentah)
demo.html             demo aplikasi (CSS/JS dipisah ke assets/demo/)
assets/
  css/  fonts.css · tailwind.css · style.css · responsive.css
  js/   theme-init.js (sync, kecil) · main.js · showcase.js · faq.js  (defer)
  fonts/ Inter, Sora, JetBrains Mono (latin, woff2, self-host)
  img/  logo-72.png
  demo/ file hasil pecahan demo.html
demo-assets/          ikon
```

Catatan: `responsive.css` berisi semua aturan mobile-first; ubah tampilan HP di sana.
Ikon berupa sprite SVG inline di index.html (tidak butuh library lucide).
