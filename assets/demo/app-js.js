// [protected] - PiketKu
(function(_$,_$$,_$$$) {
'use strict';

// ============================================================
// PERF FIX #1 - Master ticker
// Sebelumnya ada 3 setInterval(...,1000) terpisah yang jalan
// selamanya (cek devtools, jam, countdown banner) - masing2
// membangunkan main thread sendiri2 tiap detik, termasuk saat
// tab tidak aktif. Sekarang digabung jadi SATU interval, dan
// otomatis berhenti bekerja saat tab disembunyikan (background)
// via visibilitychange, lalu jalan lagi begitu tab aktif lagi.
// ============================================================
let _pkTabHidden = false;
document.addEventListener('visibilitychange', () => { _pkTabHidden = document.hidden; });
const _pkTickCallbacks = [];
function _pkRegisterTick(fn) { _pkTickCallbacks.push(fn); }
let _pkMasterInterval = null;
function _pkStartMasterTick() {
  if (_pkMasterInterval) return;
  _pkMasterInterval = setInterval(() => {
    if (_pkTabHidden) return; // hemat CPU saat tab di background
    for (let i = 0; i < _pkTickCallbacks.length; i++) {
      try { _pkTickCallbacks[i](); } catch (e) {}
    }
  }, 1000);
}
_pkStartMasterTick();

// Console protection
// PERF FIX #2 - interval devtools-check sekarang ikut master
// ticker (bukan setInterval sendiri), dan threshold outerWidth
// dilonggarkan sedikit + guard tab-hidden untuk kurangi false
// positive / kerja sia2 di layar desktop besar.
(function() {
  const _msg = '%c[!] PiketKu\n%cKode ini dilindungi. Gunakan __dev() jika developer resmi.';
  try {
    let devtools = { open: false };
    const threshold = 160;
    _pkRegisterTick(() => {
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          if (typeof console.clear === "function") console.clear();
          console.log(_msg, 'color:#10B981;font-size:14px;font-weight:bold', 'color:#9CA3AF;font-size:12px');
        }
      } else { devtools.open = false; }
    });
  } catch(e) {}
})();

// Dev access command
window.__dev = function() {
  const k = prompt('Kode akses developer:');
  if (!k) return;
  const h = Array.from(new TextEncoder().encode(k)).reduce((a,b)=>((a<<5)-a+b)|0,0).toString(16);
  if (h === '6b3d5e2f') {
    alert('[OK] Developer Mode\n\nVersi: v1.0.16\nBuild: PiketKu\nDB: Supabase REST\nAuthor: Tim Media Kreatif\n\nUntuk edit kode, gunakan versi source (unobfuscated).');
  } else {
    console.warn('[!] Kode akses salah');
  }
};


// ===== SUPABASE CONFIG =====
// [!] GANTI dengan URL dan ANON KEY dari project Supabase kamu!
// ===== KONFIGURASI SUPABASE =====
// KEAMANAN: Gunakan HANYA anon/publishable key di sini (BUKAN service_role key).
// Anon key aman di frontend karena akses data dikendalikan penuh oleh RLS di Supabase.
// JANGAN pernah taruh service_role key di sini - ia bypass semua RLS!
// Jika perlu server-side logic sensitif, buat Supabase Edge Function terpisah.
const SUPABASE_URL = 'https://demo.invalid';
const SUPABASE_KEY = 'demo-mode-no-real-key';

// ===== ROLE DEFINITIONS (label/UI only - credentials handled separately) =====
const ROLES = {
  petugas:    { label: 'Petugas Piket',  icon: 'clipboard-list', color: 'var(--cyan)',    pages: ['dashboard','input-pilih','input','pelanggaran','riwayat','setting'] },
  guru:       { label: 'Guru',           icon: 'graduation-cap', color: '#a78bfa',        pages: ['dashboard','panel-guru','riwayat','setting'] },
  sekretaris: { label: 'Sekretaris',     icon: 'book-open',      color: '#fb923c',        pages: ['dashboard','riwayat','admin','setting'] }
};

// ===== SECURE AUTH NOTE =====
// Autentikasi dan verifikasi password diproses secara aman di sisi server (/api/login).
// Kredensial dan hash password tidak disimpan pada sisi klien browser.

// ===== RATE LIMITER - cegah brute-force login =====
const _RateLimit = (() => {
  const attempts = {};
  const WINDOW_MS = 60 * 1000; // 1 menit
  const MAX_ATTEMPTS = 5;       // maks 5 percobaan per menit

  return {
    check(key) {
      const now = Date.now();
      if (!attempts[key]) attempts[key] = { count: 0, start: now };
      const entry = attempts[key];
      // Reset window jika sudah lewat 1 menit
      if (now - entry.start > WINDOW_MS) { entry.count = 0; entry.start = now; }
      if (entry.count >= MAX_ATTEMPTS) {
        const remaining = Math.ceil((WINDOW_MS - (now - entry.start)) / 1000);
        return { allowed: false, remaining };
      }
      return { allowed: true };
    },
    increment(key) {
      if (attempts[key]) attempts[key].count++;
    },
    reset(key) {
      delete attempts[key];
    }
  };
})();

let currentRole = null;
let selectedLoginRole = null;



// ===== WHAT'S NEW SYSTEM =====
const APP_VERSION = '2.0.2';

const VERSION_CHANGELOG = {
  '2.0.2': [
    'Sekretaris bisa mengisi jadwal piket otomatis dari upload gambar',
    'Hasil bacaan gambar jadi draft yang bisa dicek dan diedit sebelum disimpan',
    'Input manual tetap tersedia'
  ],
  '2.0.1': [
    'Dashboard menampilkan ringkasan pelanggaran kegiatan hari ini',
    'Panel Guru punya tab Pelanggaran Kegiatan (filter bulan, kelas, jenis, unduh Excel dan PDF)',
    'Grafik analitik Guru menampilkan pelanggaran kegiatan per jenis',
    'Rekap kegiatan di Riwayat bisa diunduh Excel dan PDF'
  ],
  '2.0.0': [
    'Fitur baru: rekap pelanggaran saat kegiatan (tidak lengkap, telat turun, makeup, tanpa ciput, tanpa legging, rambut panjang, atribut tidak sesuai)',
    'Tombol + di navigasi membuka halaman pilihan: Piket Gerbang atau Pelanggaran Kegiatan',
    'Input pelanggaran kegiatan bisa dilakukan 24 jam',
    'Tampilan navigasi bawah baru (slider melayang + tombol tambah)',
    'Riwayat punya tab Pelanggaran Kegiatan (harian, bulanan, unduh CSV)'
  ],
  '1.0.21i': [
    'Jam input dikembalikan ke semula: pukul 05:00 - 09:00 WIB',
    'Banner status waktu di form input kembali menampilkan buka/tutup dan hitung mundur'
  ],
  '1.0.21h': [
    'Jendela input kini benar-benar 24 jam: input pelanggaran dan absensi petugas tidak lagi dibatasi pukul 05:00 - 09:00 WIB',
    'Banner status waktu di form input menyesuaikan: menampilkan input terbuka 24 jam'
  ],
  '1.0.21g': [
    'Input data pelanggaran dikembalikan ke jam semula: pukul 05:00 - 09:00 WIB',
    'Banner status waktu di form input kembali menampilkan buka/tutup dan hitung mundur'
  ],
  '1.0.21f': [
    'Input data pelanggaran kini bisa dilakukan 24 jam (sebelumnya hanya pukul 05:00 - 09:00 WIB)',
    'Banner status waktu di form input menyesuaikan: menampilkan input terbuka 24 jam',
    'Absensi petugas piket tidak berubah'
  ],
  '1.0.21e': [
    'Perbaikan bug tampilan: notifikasi yang muncul 2 atau lebih kini bertumpuk rapi (yang terbaru paling depan), tidak lagi memanjang ke bawah',
    'Perbaikan bug sistem: versi aplikasi & cache diperbarui supaya perbaikan tampilan langsung terpakai tanpa nyangkut cache lama'
  ],
  '1.0.21a': [
    'Login kini diverifikasi di server, data password tidak lagi tersimpan di JavaScript publik',
    'Penyimpanan data lewat server terproteksi: hak akses Petugas / Guru / Sekretaris divalidasi server',
    'Batas waktu input 05:00 - 09:00 WIB divalidasi server, tidak bisa dilewati dari luar aplikasi',
    'Pencegahan data duplikat (nama + kelas di hari yang sama) langsung dari server',
    'Input data saat offline tersimpan di perangkat dan otomatis terkirim saat koneksi kembali',
    'Data yang belum terkirim bisa diedit atau dihapus, dengan indikator jumlah data pending di navbar',
    'Perbaikan bug: edit data offline sebelumnya selalu gagal terkirim ke server',
    'Perbaikan celah keamanan pada tombol aksi: nama tidak lagi disisipkan ke kode JavaScript',
    'Petugas kini bisa mengoreksi (edit) data dalam jam input, Guru bisa koreksi kapan saja'
  ],
  '1.0.21': [
    'manifest.json sebelumnya di-cache server selama 1 jam tanpa versi - sekarang linknya diberi ?v= supaya update-an langsung terpakai, tidak nyangkut cache lama',
    'Penyebab notif/tombol unduh masih hilang meski file sebelumnya sudah diperbaiki'
  ],
  '1.0.20': [
    'Perbaikan bug PWA tidak bisa di-install/diunduh di desktop maupun HP',
    'Penyebabnya path ikon (icon-192.png dll) di manifest.json & Service Worker tidak sesuai lokasi file yang sebenarnya, sehingga Chrome diam-diam menolak menawarkan instalasi',
    'Service Worker kini juga tidak lagi gagal total kalau ada satu aset yang gagal dimuat saat instalasi'
  ],
  '1.0.19': [
    'Perbaikan bug scroll: halaman sempat tampil putih kosong lalu baru ter-render saat discroll, dan tinggi halaman jadi salah hitung sampai sidebar terlihat "hilang" saat scroll panjang',
    'Penyebabnya properti CSS content-visibility/contain-intrinsic-size di kartu dashboard - sudah dicabut karena estimasi tingginya tidak akurat untuk kartu yang bervariasi',
    'Properti contain:paint di area konten utama juga dicabut sebagai langkah pencegahan'
  ],
  '1.0.18': [
    'Efek cursor spotlight (gradient mengikuti kursor) di kartu dashboard dihapus - mengurangi beban repaint saat scroll',
    'Efek blur (backdrop-filter) di modal & popup mode demo dihapus, diganti latar solid - blur berat untuk GPU terutama di HP spek rendah',
    'Tabel Panel Guru kini pakai halaman (pagination) 15 data per halaman, tidak lagi merender semua data sekaligus',
    'Area konten utama diberi -webkit-overflow-scrolling: touch untuk scroll momentum yang lebih halus'
  ],
  '1.0.17': [
    'Tiga timer terpisah (jam, hitung mundur banner, deteksi devtools) digabung jadi satu timer bersama agar lebih hemat sumber daya',
    'Semua timer & auto-refresh data kini otomatis berhenti saat tab/aplikasi disembunyikan (pindah tab/app lain), lalu jalan lagi saat aktif',
    'Animasi tampilan kartu & baris tabel tidak lagi diputar ulang setiap auto-refresh data (tiap 30 detik) - hanya jalan saat aksi manual (filter/pindah halaman) agar tidak terasa "kedip"'
  ],
  '1.0.16': [
    'Fitur baru khusus Guru: "Kelas Saya" - pilih kelas yang diampu agar Panel Guru otomatis terfilter setiap dibuka',
    'Fitur baru khusus Guru: "Siswa Perlu Perhatian" - deteksi otomatis siswa dengan 3 kejadian atau lebih dalam 30 hari terakhir, mencakup semua kelas',
    'Klik nama siswa di daftar "Siswa Perlu Perhatian" untuk melihat riwayat lengkap pelanggarannya dalam satu tampilan',
    'Role Guru kini juga memiliki akses ke halaman Riwayat (data harian, rekap bulanan, dan export PDF/Excel)',
    'Dashboard Guru kini menampilkan grafik analitik profesional: tren harian 14 hari, sebaran pelanggaran per kelas, dan proporsi jenis pelanggaran (30 hari terakhir)',
    'Absensi Petugas Piket disembunyikan dari Dashboard Guru - halaman ini sekarang fokus untuk memantau data siswa',
    'Setelah login, Guru mendarat langsung di halaman Dashboard (bukan otomatis dialihkan ke Panel Guru)',
    'Perbaikan Service Worker (PWA): versi cache dinaikkan dan daftar precache diperbaiki agar pembaruan aplikasi selalu langsung terpakai tanpa tampilan lama yang tersangkut'
  ],
  '1.0.15a': [
    'Perbaikan: data yang berhasil disimpan sekarang langsung muncul di dashboard/tabel tanpa perlu reload halaman',
    'Perbaikan: bug fungsi escHtml yang bentrok/dobel (celah keamanan kecil pada nama dengan tanda kutip)',
    'Perbaikan: penanganan error saat edit data yang bisa menyebabkan data dobel diam-diam di database',
    'Perbaikan: saat Mode Demo terdeteksi (tidak terhubung ke database), muncul popup peringatan agar cek koneksi internet & refresh halaman, dan input data dinonaktifkan sementara'
  ],
  '1.0.15': [
    'Tambah data siswa kelas X (RPL 1/2, TKJ 1/2, BC 1/2) TP 2026/2027',
    'Fitur baru: Rekap Bulanan - total telat & atribut tidak lengkap per siswa per bulan',
    'Ekspor Excel untuk rekap bulanan',
    'Perbaikan: cegah input data ganda dengan pengecekan ulang ke database sebelum simpan'
  ],
  '1.0.14a': [
    'Menu navigasi di mobile diubah jadi slider horizontal (bisa digeser)',
    'Tombol Setting di mobile kini berisi pilihan Changelog & Setting',
    'Perbaikan bug navigasi mobile yang sebelumnya cuma menampilkan satu tombol',
    'Perbaikan bug lain di balik layar (banner pasang aplikasi & tombol Setting)'
  ],
  '1.0.14': [
    'Web UI Improvement - tampilan antarmuka diperbarui menyeluruh',
    'Ubah kelas dari X ke XI, lalu XI ke XII secara otomatis',
    'Input data anak baru kelas X',
    'Tambah tab Setting beserta isinya',
    'Pilihan bahasa Indonesia / Inggris',
    'Pilihan mode terang / gelap atau mengikuti sistem',
    'Download APK dummy dengan shortcut logo PiketKu',
    'Perkecil ukuran tampilan di mobile karena terlalu besar'
  ],
  '1.0.13R': [
    'Fitur baru: Garda AI - asisten AI khusus resimen & organisasi sekolah',
    'Generator dokumen otomatis: proposal kegiatan, surat izin, berita acara, dan lainnya',
    'Chat tanya-jawab pandangan & ide organisasi berbasis AI',
    'History percakapan AI tersimpan otomatis di perangkat'
  ],
  '1.0.12FX': [
    'Kelas XII dihapus dari semua dropdown dan data siswa - sistem kini hanya mencakup kelas X dan XI',
    'Batas waktu input: hanya dibuka pukul 05:00 - 09:00 WIB',
    'Banner status waktu real-time tampil di form input - menampilkan sisa waktu atau notifikasi ditutup',
    'Export PDF & Excel tetap berjalan penuh dan PWA-ready di semua perangkat'
  ],
  '1.0.11': [
    'Redesain tampilan menyeluruh - tema gelap hangat, tipografi editorial',
    'Performa dioptimalkan untuk HP spek rendah - blur dihapus total',
    'Animasi ringan berbasis CSS - tidak ada efek berat di GPU',
    'Warna aksen diperbarui ke hijau sage yang lebih nyaman di mata',
    'Bayangan dan jarak antar elemen diperbaiki agar lebih bersih'
  ],
  '1.0.9': [
    'Excel diurutkan otomatis: RPL → TKJ → BC, kelas X → XI → XII',
    'Sistem absensi petugas piket sesuai hari - tandai Hadir/Tidak Hadir',
    'Absensi tersimpan ke database, sinkron semua perangkat',
    'Optimasi performa HP spek rendah: blur dikurangi, animasi dihemat',
    'Fix timezone WIB - data hari ini tampil benar sesuai jam Indonesia',
    'Pop-up notifikasi update otomatis saat versi baru dirilis'
  ],
  '1.0.8': [
    'Nama website diganti jadi Petugas Piket Sekolah',
    'Petugas tidak bisa hapus data, tapi bisa edit ulang',
    'Validasi nama duplikat hari ini saat input',
    'Excel kini ada kolom Keterangan Pelanggaran',
    'Fix error saat simpan data ke database'
  ]
};

function checkWhatsNew() {
  const seen = localStorage.getItem('app_version_seen');
  if (seen === APP_VERSION) return; // sudah pernah lihat versi ini
  showWhatsNew();
}

function showWhatsNew() {
  const changes = VERSION_CHANGELOG[APP_VERSION] || [];
  document.getElementById('whatsNewVer').textContent = 'Versi ' + APP_VERSION;
  document.getElementById('whatsNewList').innerHTML = changes
    .map(c => `<li><span class="whatsnew-dot"></span><span>${c}</span></li>`)
    .join('');
  document.getElementById('whatsNewModal').classList.add('open');
  lucide.createIcons();
}

function closeWhatsNew() {
  localStorage.setItem('app_version_seen', APP_VERSION);
  document.getElementById('whatsNewModal').classList.remove('open');
}

// ===== WIB TIMEZONE HELPER (UTC+7) =====
function getWIBDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}
function getWIBDateRange(dateStr) {
  // Convert WIB date string to UTC range for Supabase query
  const start = new Date(dateStr + 'T00:00:00+07:00').toISOString();
  const end   = new Date(dateStr + 'T23:59:59.999+07:00').toISOString();
  return { start, end };
}

// ===== STATE =====
let db = true; // using fetch directly
let allData = [];
let filteredData = [];
let currentPage = 1;
const PER_PAGE = 15;
let selectedT = false, selectedAT = false;
let deleteTargetId = null;
let editingRecordId = null;
let riwayatData = [];

// ===== LAZY-LOAD LIBRARIES BERAT (XLSX & jsPDF) =====
// Library ini cuma dibutuhkan saat tombol Ekspor diklik, jadi tidak
// perlu ikut memblokir render/parse halaman saat load pertama.
const _libCache = {};
// SRI hash untuk library yang di-load lazy (anti supply-chain tamper):
// dihitung dari file exact di cdnjs (sha384 base64)
const _SRI = {
  xlsx: 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw',
  jspdf: 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk',
  autotable: 'sha384-nQIZ6tIcczKARkLebcfqb6P67Pcv2p+KIX3NH6oGaIBc64j2HxDKerK6Efn4aeiY'
};
function _loadScriptOnce(url, integrity) {
  if (_libCache[url]) return _libCache[url];
  _libCache[url] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    if (integrity) {
      s.integrity = integrity;
      s.crossOrigin = 'anonymous';
    }
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Gagal memuat ' + url));
    document.head.appendChild(s);
  });
  return _libCache[url];
}
async function ensureXLSX() {
  if (typeof XLSX === 'undefined') {
    await _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', _SRI.xlsx);
  }
}
async function ensurePDF() {
  if (typeof window.jspdf === 'undefined') {
    await _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', _SRI.jspdf);
  }
  if (typeof window.jspdf !== 'undefined' && !window.jspdf.jsPDF.API.autoTable) {
    await _loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.6.0/jspdf.plugin.autotable.min.js', _SRI.autotable);
  }
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  // Run intro animation then hide loading screen
  const loadingScreen = document.getElementById('loadingScreen');
  const loadingLogo   = document.getElementById('loadingLogoWrap');
  const navLogoEl     = document.querySelector('.nav-logo-icon');

  // Step 1: show intro for ~1.4s then trigger shrink
  setTimeout(() => {
    if (loadingLogo) loadingLogo.classList.add('shrink-to-nav');
    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 420);
      }
    }, 420);
  }, 1400);

  checkSession();
  startClock();
  updateTimeBanner();
  startTimeBannerTick();
  lucide.createIcons();
  applyProfileEverywhere();
  initOneSignalStatusCheck();
  initOfflineSyncQueue();
});

function updateSyncBadge(count) {
  const badge = document.getElementById('syncBadge');
  const text = document.getElementById('syncText');
  if (!badge || !text) return;
  if (count > 0) {
    badge.style.display = 'inline-flex';
    badge.classList.remove('syncing');
    badge.classList.add('has-queue');
    text.textContent = `${count} Antrean`;
  } else {
    badge.style.display = 'none';
    badge.classList.remove('has-queue', 'syncing');
  }
}

function updateSyncStatusUI(isSyncing) {
  const badge = document.getElementById('syncBadge');
  const text = document.getElementById('syncText');
  if (!badge || !text) return;
  if (isSyncing) {
    badge.style.display = 'inline-flex';
    badge.classList.add('syncing');
    text.textContent = 'Menyinkronkan...';
  }
}

function initOfflineSyncQueue() {
  if (!window.OfflineQueue) return;

  window.OfflineQueue.onQueueChange((count) => {
    updateSyncBadge(count);
  });

  window.OfflineQueue.onSyncStatus((isSyncing) => {
    updateSyncStatusUI(isSyncing);
  });

  window.OfflineQueue.count().then((count) => {
    updateSyncBadge(count);
    if (typeof navigator !== 'undefined' && navigator.onLine && count > 0) {
      window.OfflineQueue.sync().then((res) => {
        if (res?.synced > 0) {
          showToast('Sinkronisasi Sukses', `${res.synced} data offline berhasil disinkronkan`, 'success');
          loadData();
        }
      });
    }
  });

  window.addEventListener('online', async () => {
    showToast('Online', 'Koneksi kembali terhubung. Memeriksa antrean...', 'info');
    if (window.OfflineQueue) {
      const res = await window.OfflineQueue.sync();
      if (res?.synced > 0) {
        showToast('Sinkronisasi Sukses', `${res.synced} data offline berhasil disinkronkan ke server`, 'success');
        await loadData();
      }
    }
  });

  window.addEventListener('offline', () => {
    showToast('Offline', 'Perangkat bekerja offline. Antrean tersimpan di perangkat.', 'info');
  });

  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && navigator.onLine && window.OfflineQueue) {
      const count = await window.OfflineQueue.count();
      if (count > 0) {
        const res = await window.OfflineQueue.sync();
        if (res?.synced > 0) {
          showToast('Sinkronisasi Sukses', `${res.synced} data offline berhasil disinkronkan ke server`, 'success');
          await loadData();
        }
      }
    }
  });
}

function checkSession() {
  const savedRole = sessionStorage.getItem('piket_role');
  const savedToken = sessionStorage.getItem('piket_token');

  // Jika ada signed token dari backend, periksa masa berlakunya
  if (savedToken) {
    try {
      const parts = savedToken.split('.');
      if (parts.length === 2) {
        const payload = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && (Date.now() / 1000) > payload.exp) {
          sessionStorage.removeItem('piket_role');
          sessionStorage.removeItem('piket_token');
          currentRole = null;
          document.getElementById('loginOverlay').style.display = 'flex';
          return;
        }
      }
    } catch (e) {
      // Abaikan jika token dalam format non-standar
    }
  }

  // FIX: sesi dari versi lama hanya menyimpan role tanpa token server. Kalau dipulihkan,
  // aplikasi terlihat login tapi semua penyimpanan gagal ("Sesi login berakhir").
  // Paksa login ulang supaya token server terbuat.
  if (savedRole && !savedToken) {
    sessionStorage.removeItem('piket_role');
    currentRole = null;
    document.getElementById('loginOverlay').style.display = 'flex';
    return;
  }

  if (savedRole && Object.prototype.hasOwnProperty.call(ROLES, savedRole)) {
    currentRole = savedRole;
    showApp();
    // Sekretaris: setelah reload, admin terkunci lagi -> popup password muncul otomatis
    if (currentRole === 'sekretaris') setTimeout(openAdminPage, 600);
    return;
  }
  currentRole = null;
  document.getElementById('loginOverlay').style.display = 'flex';
}

function showApp() {
  document.getElementById('loginOverlay').style.display = 'none';
  const app = document.getElementById('appWrapper');
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  applyRoleNav();
  initSupabase();
  setDefaultDate();
  renderJadwal();
  setTimeout(() => { loadJadwalFromDB(); setTimeout(loadAbsensi, 1200); }, 800);
  lucide.createIcons();
  setTimeout(() => { if (typeof initSidebarIndicator === 'function') initSidebarIndicator(); }, 60);
}

function applyRoleNav() {
  const role = currentRole;
  const allowed = ROLES[role]?.pages || ['dashboard'];
  document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
    btn.style.display = allowed.includes(btn.dataset.page) ? 'flex' : 'none';
  });
  document.getElementById('navFab')?.classList.toggle('role-hidden', !allowed.includes('input-pilih'));
  document.body.classList.toggle('no-fab', !allowed.includes('input-pilih'));
  // Admin page is sekretaris-only now; panel-guru is separate page

  // Dashboard guru: sembunyikan Absensi Petugas, tampilkan grafik analitik
  // Pakai class di <body> (bukan cuma inline style) supaya lebih pasti & tidak gampang ke-override
  document.body.classList.toggle('role-guru', role === 'guru');
  const absensiCard = document.getElementById('absensiCard');
  const guruCharts = document.getElementById('dashboardGuruCharts');
  if (role === 'guru') {
    if (absensiCard) absensiCard.style.display = 'none';
    if (guruCharts) guruCharts.style.display = 'block';
  } else {
    if (absensiCard) absensiCard.style.display = '';
    if (guruCharts) guruCharts.style.display = 'none';
  }
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.admin-tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab'+tab)?.classList.add('active');
  document.getElementById('tabBtn'+tab)?.classList.add('active');
  if (tab === 'Guru') filterGuruData();
  if (tab === 'Sekretaris') renderAdminForm();
  lucide.createIcons();
}

// ===== SUPABASE INIT =====
let demoMode = false;

function initSupabase() {
  if (SUPABASE_URL.includes('YOUR_PROJECT')) {
    activateDemoMode('Supabase belum dikonfigurasi.'); return;
  }
  try {
    // Inisialisasi Supabase SDK client - dibutuhkan untuk window._supa.from(...)
    const { createClient } = window.supabase;
    window._supa = createClient(SUPABASE_URL, SUPABASE_KEY);
    loadData();
    loadJadwalFromDB();
    startPolling();
  } catch(e) {
    console.error('Gagal inisialisasi Supabase SDK:', e);
    activateDemoMode('Gagal terhubung.');
  }
}

function activateDemoMode(reason) {
  demoMode = true;
  showDemoModal(reason);
  const banner = document.getElementById('demoBanner');
  if (banner) banner.style.display = 'flex';
  // Jangan hapus data yang sudah ada - tampilkan apa adanya
  updateStats(allData);
  filterData();
  renderRecent(allData.slice(0, 5));
}

// ===== DEMO MODE POPUP =====
function showDemoModal(reason) {
  const el = document.getElementById('demoModalOverlay');
  if (!el) return;
  const reasonEl = document.getElementById('demoModalReason');
  if (reasonEl) reasonEl.textContent = reason || 'Tidak terhubung.';
  el.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { el.classList.add('show'); });
  });
}

function closeDemoModal() {
  const el = document.getElementById('demoModalOverlay');
  if (!el) return;
  el.classList.remove('show');
  setTimeout(() => { el.style.display = 'none'; }, 400);
}

// ===== SUPABASE FETCH WRAPPER =====
// CATATAN: supaFetch (raw REST) sudah diganti dengan Supabase SDK di semua operasi utama.
// Fungsi ini dipertahankan untuk kompatibilitas tetapi dinonaktifkan dari penggunaan langsung.
// Selalu gunakan window._supa.from(...) yang otomatis parameterized.
async function supaFetch(path, opts = {}) {
  // Hanya izinkan path yang valid - cegah path traversal
  if (!opts.skipPathCheck && !/^[a-zA-Z0-9_?=&.,%:\-+]+$/.test(path)) {
    throw new Error('Path tidak valid');
  }
  const prefer = opts.prefer || (opts.method === 'GET' ? 'return=representation' : 'return=minimal');
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': prefer
    },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!res.ok) {
    // Jangan expose detail error ke user - log saja ke console
    const errText = await res.text().catch(() => '');
    console.warn('[supaFetch] Error ' + res.status + ':', errText.substring(0, 100));
    throw new Error('Operasi database gagal');
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ===== SECURE WRITE PROXY HELPER & OFFLINE QUEUE =====
// Semua operasi write diarahkan ke endpoint serverless /api/write
// dengan fallback otomatis ke IndexedDB OfflineQueue saat offline.
async function apiWrite(payload) {
  const token = sessionStorage.getItem('piket_token');
  if (!token) {
    showToast('Akses Ditolak', 'Sesi login berakhir atau tidak ditemukan, silakan login ulang', 'error');
    throw new Error('Sesi tidak valid');
  }

  // Cek apakah perangkat sedang offline
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isOffline) {
    if (window.OfflineQueue) {
      try {
        const queueId = await window.OfflineQueue.enqueue({
          table: payload.table,
          action: payload.action,
          data: payload.data,
          filter: payload.filter,
          token
        });
        return { ok: true, offline: true, queueId };
      } catch (qErr) {
        console.warn('[apiWrite] Gagal enqueue offline:', qErr);
      }
    }
    showToast('Offline', 'Tidak terhubung ke jaringan', 'error');
    throw new Error('Tidak terhubung');
  }

  let res;
  try {
    res = await fetch('/api/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        table: payload.table,
        action: payload.action,
        data: payload.data,
        filter: payload.filter
      })
    });
  } catch (err) {
    // Jika fetch gagal karena jaringan putus saat request berjalan
    if (window.OfflineQueue) {
      try {
        const queueId = await window.OfflineQueue.enqueue({
          table: payload.table,
          action: payload.action,
          data: payload.data,
          filter: payload.filter,
          token
        });
        return { ok: true, offline: true, queueId };
      } catch (qErr) {
        console.warn('[apiWrite] Gagal enqueue offline setelah fetch error:', qErr);
      }
    }
    showToast('Offline', 'Tidak terhubung ke jaringan', 'error');
    throw new Error('Tidak terhubung');
  }

  let resJson = null;
  try {
    resJson = await res.json();
  } catch (e) {}

  // Token kadaluarsa / tidak valid -> paksa logout supaya user tidak stuck error aneh
  if (res.status === 401) {
    try {
      sessionStorage.removeItem('piket_role');
      sessionStorage.removeItem('piket_user');
      sessionStorage.removeItem('piket_token');
    } catch (e) {}
    showToast('Sesi Berakhir', 'Sesi login sudah berakhir, silakan login ulang', 'error');
    setTimeout(() => location.reload(), 1200);
    throw new Error('Sesi berakhir');
  }

  if (!res.ok || !resJson?.ok) {
    const errMsg = resJson?.error || 'Gagal menyimpan data';
    throw new Error(errMsg);
  }

  return resJson;
}

// PERF FIX #3 - flag ini di-set true sesaat sebelum loadData()
// dipanggil OTOMATIS oleh polling (bukan oleh aksi user seperti
// filter/pindah halaman). Dipakai supaya render tabel hasil
// polling tidak memicu ulang animasi stagger untuk SEMUA baris
// tiap 30 detik (yang sebelumnya bikin reflow & terasa "kedip"/
// berat di desktop). Animasi tetap jalan normal untuk aksi manual.
let _pkIsAutoRefresh = false;
// FIX: dipakai juga oleh blok animasi di bagian bawah file (scope berbeda), expose lewat getter global
Object.defineProperty(window, '_pkIsAutoRefresh', { get: () => _pkIsAutoRefresh, configurable: true });

async function loadData() {
  if (demoMode) return;
  const today = getWIBDate();
  const { start, end } = getWIBDateRange(today);
  try {
    const encoded_start = encodeURIComponent(start);
    const encoded_end   = encodeURIComponent(end);
    const data = await supaFetch(
      'piket_resimen?waktu_input=gte.' + encoded_start +
      '&waktu_input=lte.' + encoded_end +
      '&order=waktu_input.desc',
      { skipPathCheck: true }
    );
    allData = data || [];
    updateStats(allData);
    filterData();
    renderRecent(allData.slice(0, 5));
    loadKegiatanToday();
    if (document.getElementById('page-panel-guru')?.classList.contains('active')) filterGuruData();
  } catch(e) {
    if (!demoMode) {
      if (sessionStorage.getItem('piket_token')) {
        // User terotentikasi: tetap dalam mode normal dengan data cache / offline
        console.warn('[loadData] Jaringan offline, menggunakan data cache / antrean offline');
        updateStats(allData); filterData(); renderRecent(allData.slice(0,5));
      } else {
        demoMode = true;
        window._supa = null;
        showDemoModal('Koneksi terputus.');
        const banner = document.getElementById('demoBanner');
        if (banner) banner.style.display = 'flex';
        updateStats(allData); filterData(); renderRecent(allData.slice(0,5));
        console.warn('DB tidak tersedia, mode demo aktif:', e.message);
      }
    }
  }
}

let pollingInterval = null;

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    if (_pkTabHidden) return; // PERF FIX - jangan poll saat tab di background
    if (db && !demoMode) {
      _pkIsAutoRefresh = true;
      Promise.resolve(loadData()).finally(() => { _pkIsAutoRefresh = false; });
      if (!document.getElementById('page-admin')?.classList.contains('active')) {
        loadJadwalFromDB();
      }
    }
  }, 30000);
}

// ===== STATS =====
function updateStats(data) {
  const telat = data.filter(d => d.pelanggaran === 'T' || d.pelanggaran === 'T+AT').length;
  const atribut = data.filter(d => d.pelanggaran === 'AT' || d.pelanggaran === 'T+AT').length;
  animateCount('statTelat', telat);
  animateCount('statAtribut', atribut);
  animateCount('statTotal', data.length);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 20));
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(iv);
  }, 40);
}

// ===== FILTER & RENDER TABLE =====
function filterData() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const kelas  = document.getElementById('filterKelas')?.value || '';
  const jenis  = document.getElementById('filterJenis')?.value || '';

  filteredData = allData.filter(d => {
    const matchName  = (d.nama || '').toLowerCase().includes(search);
    const matchKelas = !kelas || d.kelas === kelas;
    const matchJenis = !jenis || d.pelanggaran === jenis;
    return matchName && matchKelas && matchJenis;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const body = document.getElementById('tableBody');
  const count = document.getElementById('tableCount');

  count.textContent = `Menampilkan ${filteredData.length} data hari ini`;

  if (!filteredData.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-icon"><i data-lucide="inbox" style="width:28px;height:28px;color:var(--cyan)"></i></div>
      <div class="empty-title">Belum ada data hari ini</div>
      <div class="empty-sub">Data akan muncul di sini setelah diinput petugas</div>
    </div></td></tr>`;
    document.getElementById('pagination').style.display = 'none';
    lucide.createIcons();
    return;
  }

  const total = Math.ceil(filteredData.length / PER_PAGE);
  const start = (currentPage - 1) * PER_PAGE;
  const slice = filteredData.slice(start, start + PER_PAGE);

  body.innerHTML = slice.map((d, i) => `
    <tr>
      <td class="col-no" style="color:var(--white-dim);font-size:12px">${start + i + 1}</td>
      <td class="td-name">${escHtml(d.nama)}</td>
      <td class="td-class">${escHtml(d.kelas)}</td>
      <td><span class="badge ${d.pelanggaran==='T'?'telat':d.pelanggaran==='AT'?'atribut':'both'}">${escHtml(d.pelanggaran)}</span></td>
      <td class="td-detail col-detail" title="${escHtml(d.detail || '')}">${escHtml(d.detail || '-')}</td>
      <td class="td-time col-time">${formatTime(d.waktu_input)}</td>
      <td style="width:44px">
        ${currentRole === 'petugas'
          ? `<button class="btn-delete" style="background:rgba(6,214,224,0.08);border-color:rgba(6,214,224,0.3);color:var(--cyan)" data-edit-id="${escHtml(String(d.id))}" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
             </button>`
          : `<button class="btn-delete" data-del-id="${escHtml(String(d.id))}" data-del-nama="${escHtml(d.nama || '')}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
             </button>`}
      </td>
    </tr>`).join('');

  // Pagination
  const pg = document.getElementById('pagination');
  pg.style.display = filteredData.length > PER_PAGE ? 'flex' : 'none';
  document.getElementById('pageInfo').textContent = `Halaman ${currentPage} dari ${total} · ${filteredData.length} data`;

  const btns = document.getElementById('pageBtns');
  btns.innerHTML = '';
  const prev = Object.assign(document.createElement('button'), { className: 'page-btn', innerHTML: '<i data-lucide="chevron-left" style="width:14px;height:14px"></i>' });
  prev.disabled = currentPage === 1;
  prev.onclick = () => { currentPage--; renderTable(); };
  btns.appendChild(prev);

  for (let p = 1; p <= total; p++) {
    if (total > 7 && p > 2 && p < total - 1 && Math.abs(p - currentPage) > 1) {
      if (btns.lastChild?.textContent !== '...') {
        const dots = document.createElement('button');
        dots.className = 'page-btn'; dots.textContent = '...'; dots.disabled = true;
        btns.appendChild(dots);
      }
      continue;
    }
    const b = document.createElement('button');
    b.className = 'page-btn' + (p === currentPage ? ' active' : '');
    b.textContent = p;
    b.onclick = () => { currentPage = p; renderTable(); };
    btns.appendChild(b);
  }

  const next = Object.assign(document.createElement('button'), { className: 'page-btn', innerHTML: '<i data-lucide="chevron-right" style="width:14px;height:14px"></i>' });
  next.disabled = currentPage === total;
  next.onclick = () => { currentPage++; renderTable(); };
  btns.appendChild(next);

  lucide.createIcons();
}


function editRecord(id) {
  // Auth guard - hanya petugas yang bisa edit (bukan hapus)
  if (!currentRole || currentRole !== 'petugas') {
    showToast('Akses Ditolak', 'Anda tidak memiliki izin mengedit data', 'error');
    return;
  }

  const safeId = validateId(id);
  if (!safeId) { showToast('Error', 'ID tidak valid', 'error'); return; }

  const d = allData.find(r => r.id === safeId);
  if (!d) return;
  navigateTo('input', document.getElementById('inputSidebarBtn'));
  setTimeout(() => {
    document.getElementById('inputNama').value = d.nama;
    document.getElementById('inputKelas').value = d.kelas;
    document.getElementById('inputDetail').value = d.detail || '';
    selectedT = d.pelanggaran === 'T' || d.pelanggaran === 'T+AT';
    selectedAT = d.pelanggaran === 'AT' || d.pelanggaran === 'T+AT';
    document.getElementById('btnTelat').className = 'violation-btn' + (selectedT ? ' selected telat' : '');
    document.getElementById('btnAtribut').className = 'violation-btn' + (selectedAT ? ' selected atribut' : '');
    
    // Set mode edit aman (jangan hapus data sebelum konfirmasi simpan!)
    editingRecordId = safeId;
    const btnText = document.getElementById('submitBtnText');
    if (btnText) btnText.textContent = 'Simpan Perubahan';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    showToast('Mode Edit', 'Data dimuat ke form, ubah lalu simpan perubahan', 'info');
  }, 200);
}

function cancelEdit() {
  editingRecordId = null;
  resetForm();
  showToast('Dibatalkan', 'Mode edit dibatalkan', 'info');
}

// ===== EVENT DELEGATION (FIX T2 - ganti inline onclick yang rawan XSS) =====
// Tombol aksi tabel (edit/hapus), toggle absensi, dan baris siswa perhatian
// sekarang membawa data-* attributes alih-alih meminterpolasi nama ke string
// JavaScript di dalam atribut HTML. Satu listener global menangani semuanya,
// jadi payload dari database tidak pernah dieksekusi sebagai kode.
document.addEventListener('click', (e) => {
  // Tombol edit record (petugas)
  const editBtn = e.target.closest('[data-edit-id]');
  if (editBtn) {
    editRecord(editBtn.getAttribute('data-edit-id'));
    return;
  }
  // Tombol hapus record (sekretaris/guru)
  const delBtn = e.target.closest('[data-del-id]');
  if (delBtn) {
    askDelete(delBtn.getAttribute('data-del-id'), delBtn.getAttribute('data-del-nama') || '');
    return;
  }
  // Toggle absensi petugas piket
  const absBtn = e.target.closest('[data-absensi-nama]');
  if (absBtn) {
    toggleAbsensi(absBtn.getAttribute('data-absensi-nama'), absBtn.getAttribute('data-absensi-status') || 'pending');
    return;
  }
  // Kartu siswa perhatian -> modal riwayat siswa
  const riwCard = e.target.closest('[data-riwayat-nama]');
  if (riwCard) {
    showRiwayatSiswa(riwCard.getAttribute('data-riwayat-nama'), riwCard.getAttribute('data-riwayat-kelas'));
    return;
  }
});

function renderRecent(data) {
  const body = document.getElementById('recentBody');
  if (!body) return;
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:30px">
      <div class="empty-title" style="font-size:14px">Belum ada entri hari ini</div></div></td></tr>`;
    return;
  }
  body.innerHTML = data.map((d, i) => `
    <tr>
      <td class="td-name">${escHtml(d.nama)}</td>
      <td class="td-class">${escHtml(d.kelas)}</td>
      <td><span class="badge ${d.pelanggaran==='T'?'telat':d.pelanggaran==='AT'?'atribut':'both'}">${escHtml(d.pelanggaran)}</span></td>
      <td class="td-time">${formatTime(d.waktu_input)}</td>
      <td>${currentRole !== 'petugas' ? `<button class="btn-delete" data-del-id="${escHtml(String(d.id))}" data-del-nama="${escHtml(d.nama || '')}">
        <i data-lucide="trash-2" style="width:13px;height:13px"></i>
      </button>` : ''}</td>
    </tr>`).join('');
  lucide.createIcons();
}

// ===== FORM =====
function toggleViolation(type) {
  if (type === 'T') selectedT = !selectedT;
  if (type === 'AT') selectedAT = !selectedAT;
  document.getElementById('btnTelat').className = 'violation-btn' + (selectedT ? ' selected telat' : '');
  document.getElementById('btnAtribut').className = 'violation-btn' + (selectedAT ? ' selected atribut' : '');
}
function getSelectedViolation() {
  if (selectedT && selectedAT) return 'T+AT';
  if (selectedT) return 'T';
  if (selectedAT) return 'AT';
  return '';
}

async function submitData() {
  // Auth guard - pastikan user sudah login dan punya akses
  if (!currentRole || !ROLES[currentRole]) {
    showToast('Akses Ditolak', 'Sesi tidak valid, silakan login ulang', 'error');
    return;
  }
  // Hanya petugas dan sekretaris boleh input
  if (!['petugas', 'sekretaris'].includes(currentRole)) {
    showToast('Akses Ditolak', 'Anda tidak memiliki izin untuk input data', 'error');
    return;
  }

  // Mode demo = tidak terhubung ke database - jangan izinkan input jika user belum terotentikasi
  if (demoMode && !sessionStorage.getItem('piket_token')) {
    showDemoModal('Tidak terhubung. Input data tidak bisa dilakukan sebelum koneksi pulih.');
    return;
  }

  // Batas waktu input: 05:00 - 09:00 WIB
  const _now = new Date();
  const _wibH = (_now.getUTCHours() + 7) % 24;
  const _wibM = _now.getUTCMinutes();
  const _wibTotal = _wibH * 60 + _wibM;
  if (false) { // [WEB DEMO] input bebas jam
    showToast('Waktu Habis', 'Input data hanya bisa pada pukul 05:00 hingga 09:00 pagi', 'error');
    return;
  }

  const namaRaw   = document.getElementById('inputNama').value.trim();
  const kelasRaw  = document.getElementById('inputKelas').value;
  const detailRaw = document.getElementById('inputDetail').value.trim();

  // Sanitasi input
  const nama   = sanitizeInput(namaRaw);
  const detail = sanitizeInput(detailRaw);
  // FIX: normalisasi kelas (spasi ganda/nbsp/huruf kecil) dan fallback otomatis dari
  // data siswa kalau dropdown kelas kosong tapi nama cocok persis dengan 1 siswa.
  let kelas = normalizeKelas(kelasRaw);
  if (!kelas && nama) {
    const nn = nama.toLowerCase().replace(/\s+/g, ' ').trim();
    const hit = STUDENTS.filter(s => s.nama.toLowerCase().replace(/\s+/g, ' ').trim() === nn);
    if (hit.length === 1) {
      kelas = normalizeKelas(hit[0].kelas);
      const sel = document.getElementById('inputKelas');
      if (sel) sel.value = kelas;
    }
  }

  if (!nama)  return showToast('Validasi', 'Nama siswa tidak boleh kosong', 'error');
  if (nama.length < 2) return showToast('Validasi', 'Nama terlalu pendek', 'error');
  if (nama.length > 100) return showToast('Validasi', 'Nama terlalu panjang', 'error');

  // Validasi kelas dari whitelist
  if (!kelas || !ALLOWED_KELAS.includes(kelas)) {
    console.warn('[submitData] Kelas ditolak:', JSON.stringify(kelasRaw), '| whitelist:', ALLOWED_KELAS.join(', '));
    return showToast('Validasi', kelasRaw
      ? `Kelas "${escHtml(String(kelasRaw))}" tidak dikenali. Muat ulang halaman (Ctrl+Shift+R) lalu pilih kelas lagi`
      : 'Pilih kelas yang valid', 'error');
  }

  const pelanggaran = getSelectedViolation();
  if (!pelanggaran || !ALLOWED_PELANGGARAN.includes(pelanggaran))
    return showToast('Validasi', 'Pilih jenis pelanggaran (T / AT / T+AT)', 'error');

  // Rate limiting submit - cegah spam input
  const rl = _RateLimit.check('submit_data');
  if (!rl.allowed) {
    return showToast('Terlalu cepat', `Tunggu ${rl.remaining} detik sebelum input lagi`, 'error');
  }

  // Cek nama duplikat hari ini (abaikan record sendiri saat mode edit aktif)
  const namaLower = nama.toLowerCase().replace(/\s+/g, ' ').trim();
  const duplicateLocal = allData.find(d => 
    (!editingRecordId || d.id !== editingRecordId) &&
    d.nama.toLowerCase().replace(/\s+/g, ' ').trim() === namaLower && 
    d.kelas === kelas
  );
  if (duplicateLocal) return showToast('Duplikat', `${nama} dari ${kelas} sudah tercatat hari ini`, 'error');

  const btn = document.getElementById('submitBtn');
  btn.classList.add('loading'); btn.disabled = true;

  // Cek ulang ke database sebelum simpan (hanya saat insert baru)
  if (!demoMode && db && !editingRecordId) {
    try {
      const today = getWIBDate();
      const { start, end } = getWIBDateRange(today);
      const { data: freshCheck, error: checkErr } = await window._supa
        .from('piket_resimen').select('id,nama,kelas')
        .gte('waktu_input', start).lte('waktu_input', end)
        .eq('kelas', kelas);
      if (!checkErr && Array.isArray(freshCheck)) {
        const alreadyExists = freshCheck.some(d => (d.nama || '').toLowerCase().replace(/\s+/g, ' ').trim() === namaLower);
        if (alreadyExists) {
          btn.classList.remove('loading'); btn.disabled = false;
          showToast('Duplikat', `${nama} dari ${kelas} sudah tercatat hari ini`, 'error');
          return;
        }
      }
    } catch (e) {
      console.warn('[submitData] Gagal cek ulang duplikat:', e.message);
    }
  }

  _RateLimit.increment('submit_data');

  const record = {
    nama:        nama,
    kelas:       kelas,
    pelanggaran: pelanggaran,
    detail:      detail
  };

  let writeRes = null;
  try {
    // Record offline (belum tersinkron): edit payload di antrean lokal,
    // JANGAN kirim action 'update' ke server (id belum ada di server).
    if (editingRecordId && typeof editingRecordId === 'string' && editingRecordId.startsWith('_offline_')) {
      if (!window.OfflineQueue) throw new Error('Mode offline tidak tersedia di browser ini');
      const queueId = parseInt(editingRecordId.replace('_offline_', ''), 10);
      const edited = await window.OfflineQueue.editPending(queueId, record);
      if (!edited) throw new Error('Data offline yang diedit sudah tidak ada di antrean');
      writeRes = { ok: true, offline: true, queueId };
    } else if (editingRecordId) {
      // UPDATE mode jika sedang edit via proxy /api/write
      writeRes = await apiWrite({
        table: 'piket_resimen',
        action: 'update',
        data: record,
        filter: { id: editingRecordId }
      });
    } else {
      // INSERT mode jika baru via proxy /api/write
      writeRes = await apiWrite({
        table: 'piket_resimen',
        action: 'insert',
        data: record
      });
    }
  } catch(e) {
    btn.classList.remove('loading'); btn.disabled = false;
    showToast('Error', e.message || 'Gagal menyimpan data', 'error');
    return;
  }

  if (writeRes?.offline) {
    // Optimistic offline update: tambahkan ke tabel lokal dan perbarui statistik
    const localRecord = {
      ...record,
      id: writeRes.queueId ? `_offline_${writeRes.queueId}` : `_offline_${Date.now()}`,
      waktu_input: new Date().toISOString(),
      _isOffline: true
    };
    if (editingRecordId) {
      const idx = allData.findIndex(d => d.id === editingRecordId);
      if (idx !== -1) allData[idx] = { ...allData[idx], ...record };
    } else {
      allData.unshift(localRecord);
    }
    updateStats(allData);
    filterData();
    renderRecent(allData.slice(0, 5));
    if (document.getElementById('page-panel-guru')?.classList.contains('active')) filterGuruData();

    btn.classList.remove('loading'); btn.disabled = false;
    showToast('Disimpan Offline', `Data ${escHtml(nama)} tersimpan di perangkat & otomatis dikirim saat online`, 'info');
    resetForm();
    return;
  }

  // Refresh data dari database supaya dashboard, tabel, dan statistik
  // langsung sinkron dengan data yang baru tersimpan
  try {
    await loadData();
  } catch (e) {
    console.warn('[submitData] Gagal refresh data setelah simpan:', e.message);
  }
  btn.classList.remove('loading'); btn.disabled = false;
  showToast('Berhasil!', `Data ${escHtml(nama)} berhasil disimpan`, 'success');
  resetForm();
}

function resetForm() {
  editingRecordId = null;
  document.getElementById('inputNama').value = '';
  document.getElementById('inputKelas').value = '';
  document.getElementById('inputDetail').value = '';
  selectedT = false; selectedAT = false;
  document.getElementById('btnTelat').className = 'violation-btn';
  document.getElementById('btnAtribut').className = 'violation-btn';
  const btnText = document.getElementById('submitBtnText');
  if (btnText) btnText.textContent = 'Simpan Data Pelanggaran';
  const cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

// ===== DELETE =====
function askDelete(id, name) {
  deleteKegiatanId = null;
  // Auth guard - cegah petugas mengakses dialog hapus
  if (!currentRole || !['sekretaris', 'guru'].includes(currentRole)) {
    showToast('Akses Ditolak', 'Anda tidak memiliki izin menghapus data', 'error');
    return;
  }
  const safeId = validateId(id);
  if (!safeId) { showToast('Error', 'ID tidak valid', 'error'); return; }

  deleteTargetId = safeId;
  const targetItem = allData.find(d => d.id === safeId) ||
                     (typeof riwayatData !== 'undefined' ? riwayatData.find(d => d.id === safeId) : null) ||
                     (typeof guruFiltered !== 'undefined' ? guruFiltered.find(d => d.id === safeId) : null);
  const displayName = name || (targetItem ? targetItem.nama : 'data ini');
  // Gunakan escHtml untuk mencegah XSS di dalam modal text
  const safeMsg = document.getElementById('confirmMsg');
  if (safeMsg) safeMsg.textContent = `Hapus data "${displayName}"? Tindakan ini tidak bisa dibatalkan.`;
  document.getElementById('confirmModal').classList.add('open');
}

async function confirmDelete() {
  if (deleteKegiatanId) return confirmDeleteKegiatan();
  if (!deleteTargetId) return;

  // Auth guard - hanya sekretaris dan guru boleh hapus
  if (!currentRole || !['sekretaris', 'guru'].includes(currentRole)) {
    showToast('Akses Ditolak', 'Anda tidak memiliki izin menghapus data', 'error');
    closeModal();
    return;
  }

  const id = validateId(deleteTargetId);
  if (!id) { showToast('Error', 'ID tidak valid', 'error'); closeModal(); return; }
  closeModal();

  if (typeof id === 'string' && id.startsWith('_offline_')) {
    const queueId = parseInt(id.replace('_offline_', ''), 10);
    if (window.OfflineQueue) {
       await window.OfflineQueue.remove(queueId);
    }
    allData = allData.filter(d => d.id !== id);
    if (typeof riwayatData !== 'undefined') {
       riwayatData = riwayatData.filter(d => d.id !== id);
    }
    if (typeof guruFiltered !== 'undefined') {
       guruFiltered = guruFiltered.filter(d => d.id !== id);
    }
    if (typeof siswaPerhatianRaw !== 'undefined') {
       siswaPerhatianRaw = siswaPerhatianRaw.filter(d => d.id !== id);
    }
    updateStats(allData);
    filterData();
    renderRecent(allData.slice(0, 5));
    if (document.getElementById('page-riwayat')?.classList.contains('active')) {
      renderRiwayat(riwayatData);
    }
    if (document.getElementById('page-panel-guru')?.classList.contains('active')) {
      filterGuruData();
      if (typeof loadSiswaPerhatian === 'function') loadSiswaPerhatian();
    }
    showToast('Dihapus', 'Data lokal berhasil dihapus', 'info');
    return;
  }
  
  if (demoMode || !db) {
    allData = allData.filter(d => d.id !== id);
    if (typeof riwayatData !== 'undefined') {
      riwayatData = riwayatData.filter(d => d.id !== id);
    }
    if (typeof guruFiltered !== 'undefined') {
      guruFiltered = guruFiltered.filter(d => d.id !== id);
    }
    if (typeof siswaPerhatianRaw !== 'undefined') {
      siswaPerhatianRaw = siswaPerhatianRaw.filter(d => d.id !== id);
    }
    updateStats(allData);
    filterData();
    renderRecent(allData.slice(0, 5));
    if (document.getElementById('page-riwayat')?.classList.contains('active')) {
      renderRiwayat(riwayatData);
    }
    if (document.getElementById('page-panel-guru')?.classList.contains('active')) {
      filterGuruData();
      if (typeof loadSiswaPerhatian === 'function') loadSiswaPerhatian();
    }
    showToast('Dihapus', 'Data berhasil dihapus (mode demo)', 'info');
    return;
  }

  let writeRes;
  try {
    writeRes = await apiWrite({
      table: 'piket_resimen',
      action: 'delete',
      filter: { id }
    });
  } catch(e) {
    console.error('[confirmDelete] Gagal menghapus:', e);
    showToast('Error', e.message || 'Gagal menghapus data', 'error');
    return;
  }

  try {
    allData = allData.filter(d => d.id !== id);
    if (typeof riwayatData !== 'undefined') {
      riwayatData = riwayatData.filter(d => d.id !== id);
    }
    if (typeof guruFiltered !== 'undefined') {
      guruFiltered = guruFiltered.filter(d => d.id !== id);
    }
    if (typeof siswaPerhatianRaw !== 'undefined') {
      siswaPerhatianRaw = siswaPerhatianRaw.filter(d => d.id !== id);
    }
    updateStats(allData);
    filterData();
    renderRecent(allData.slice(0, 5));
    if (document.getElementById('page-riwayat')?.classList.contains('active')) {
      renderRiwayat(riwayatData);
    }
    if (document.getElementById('page-panel-guru')?.classList.contains('active')) {
      filterGuruData();
      if (typeof loadSiswaPerhatian === 'function') loadSiswaPerhatian();
    }
  } catch (renderErr) {
    console.warn('[confirmDelete] render update error:', renderErr);
  }

  if (writeRes?.offline) {
    showToast('Dihapus Offline', 'Data dihapus dari perangkat & akan disinkronkan saat online', 'info');
  } else {
    showToast('Dihapus', 'Data berhasil dihapus', 'info');
  }
}
function closeModal() {
  document.getElementById('confirmModal').classList.remove('open');
  deleteTargetId = null;
  deleteKegiatanId = null;
}

// ===== RIWAYAT =====
function setDefaultDate() {
  const today = getWIBDate();
  const el = document.getElementById('riwayatDate');
  if (el) el.value = today;
}

async function loadRiwayat() {
  // Auth guard
  if (!currentRole || !ROLES[currentRole]) return;

  const dateRaw = document.getElementById('riwayatDate').value;
  if (!dateRaw) return;

  // Validasi format tanggal - hanya YYYY-MM-DD yang valid
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    showToast('Validasi', 'Format tanggal tidak valid', 'error');
    return;
  }
  const date = dateRaw; // sudah tervalidasi

  document.getElementById('riwayatTitle').textContent = `Data tanggal ${formatDateID(date)}`;

  if (demoMode) {
    const d = allData.filter(r => r.waktu_input && r.waktu_input.startsWith(date));
    riwayatData = d;
    renderRiwayatStats(d);
    renderRiwayatTable(d);
    return;
  }

  const { start, end } = getWIBDateRange(date);
  try {
    const { data, error } = await window._supa
      .from('piket_resimen').select('*')
      .gte('waktu_input', start)
      .lte('waktu_input', end)
      .order('waktu_input', { ascending: false });

    if (error) {
      console.warn('[loadRiwayat] DB error:', error.message);
      showToast('Error', 'Gagal memuat riwayat', 'error');
      return;
    }
    riwayatData = data || [];
    renderRiwayatStats(riwayatData);
    renderRiwayatTable(riwayatData);
  } catch(e) {
    showToast('Error', 'Gagal memuat riwayat', 'error');
  }
}

function renderRiwayat(data) {
  renderRiwayatStats(data || riwayatData);
  renderRiwayatTable(data || riwayatData);
}

function renderRiwayatStats(data) {
  animateCount('rStat1', data.filter(d => d.pelanggaran === 'T' || d.pelanggaran === 'T+AT').length);
  animateCount('rStat2', data.filter(d => d.pelanggaran === 'AT' || d.pelanggaran === 'T+AT').length);
  animateCount('rStat3', data.length);
}

function renderRiwayatTable(data) {
  const body = document.getElementById('riwayatBody');
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="empty-icon"><i data-lucide="inbox" style="width:28px;height:28px;color:var(--cyan)"></i></div>
      <div class="empty-title">Tidak ada data pada tanggal ini</div>
    </div></td></tr>`;
    return;
  }
  body.innerHTML = data.map((d, i) => `
    <tr>
      <td class="col-no" style="color:var(--white-dim);font-size:12px">${i + 1}</td>
      <td class="td-name">${escHtml(d.nama)}</td>
      <td class="td-class">${escHtml(d.kelas)}</td>
      <td><span class="badge ${d.pelanggaran==='T'?'telat':d.pelanggaran==='AT'?'atribut':'both'}">${escHtml(d.pelanggaran)}</span></td>
      <td class="td-detail col-detail">${escHtml(d.detail || '-')}</td>
      <td class="td-time col-time">${formatTime(d.waktu_input)}</td>
      <td>${currentRole !== 'petugas' ? `<button class="btn-delete" data-del-id="${escHtml(String(d.id))}" data-del-nama="${escHtml(d.nama || '')}">
        <i data-lucide="trash-2" style="width:13px;height:13px"></i>
      </button>` : ''}</td>
    </tr>`).join('');
  lucide.createIcons();
}

// ===== REKAP BULANAN =====
let rekapBulanData = [];

function setDefaultRekapBulan() {
  const el = document.getElementById('rekapBulan');
  if (!el) return;
  const today = getWIBDate(); // 'YYYY-MM-DD'
  el.value = today.slice(0, 7); // 'YYYY-MM'
}

async function loadRekapBulanan() {
  if (!currentRole || !ROLES[currentRole]) return;
  const bulanRaw = document.getElementById('rekapBulan').value;
  if (!bulanRaw) return;
  if (!/^\d{4}-\d{2}$/.test(bulanRaw)) {
    showToast('Validasi', 'Format bulan tidak valid', 'error');
    return;
  }
  const kelasFilter = document.getElementById('rekapFilterKelas').value;

  const [y, m] = bulanRaw.split('-').map(Number);
  const startDate = `${bulanRaw}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${bulanRaw}-${String(lastDay).padStart(2,'0')}`;

  const namaBulan = new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  document.getElementById('rekapBulanTitle').textContent = `Rekap ${namaBulan}${kelasFilter ? ' - ' + kelasFilter : ''}`;

  let rows = [];
  if (demoMode) {
    rows = allData.filter(r => r.waktu_input && r.waktu_input.slice(0,10) >= startDate && r.waktu_input.slice(0,10) <= endDate);
  } else {
    const { start } = getWIBDateRange(startDate);
    const { end } = getWIBDateRange(endDate);
    try {
      let q = window._supa.from('piket_resimen').select('*').gte('waktu_input', start).lte('waktu_input', end);
      const { data, error } = await q;
      if (error) {
        console.warn('[loadRekapBulanan] DB error:', error.message);
        showToast('Error', 'Gagal memuat rekap bulanan', 'error');
        return;
      }
      rows = data || [];
    } catch (e) {
      showToast('Error', 'Gagal memuat rekap bulanan', 'error');
      return;
    }
  }

  if (kelasFilter) rows = rows.filter(r => r.kelas === kelasFilter);

  // Agregasi per siswa (nama + kelas)
  const map = new Map();
  rows.forEach(r => {
    const key = r.nama.toLowerCase().trim() + '|' + r.kelas;
    if (!map.has(key)) map.set(key, { nama: r.nama, kelas: r.kelas, telat: 0, atribut: 0 });
    const rec = map.get(key);
    if (r.pelanggaran === 'T' || r.pelanggaran === 'T+AT') rec.telat++;
    if (r.pelanggaran === 'AT' || r.pelanggaran === 'T+AT') rec.atribut++;
  });

  rekapBulanData = sortByClass(Array.from(map.values()))
    .sort((a, b) => (b.telat + b.atribut) - (a.telat + a.atribut));

  renderRekapBulanan(rekapBulanData);
}

function renderRekapBulanan(data) {
  const body = document.getElementById('rekapBulanBody');
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-icon"><i data-lucide="inbox" style="width:28px;height:28px;color:var(--cyan)"></i></div>
      <div class="empty-title">Tidak ada data pelanggaran pada bulan ini</div>
    </div></td></tr>`;
    lucide.createIcons();
    return;
  }
  body.innerHTML = data.map((d, i) => `
    <tr>
      <td class="col-no" style="color:var(--white-dim);font-size:12px">${i + 1}</td>
      <td class="td-name">${escHtml(d.nama)}</td>
      <td class="td-class">${escHtml(d.kelas)}</td>
      <td><span class="badge telat">${d.telat}</span></td>
      <td><span class="badge atribut">${d.atribut}</span></td>
      <td style="font-weight:600">${d.telat + d.atribut}</td>
    </tr>`).join('');
  lucide.createIcons();
}

async function exportRekapBulananExcel() {
  await ensureXLSX();
  if (!rekapBulanData.length) return showToast('Kosong', 'Tidak ada data rekap untuk diekspor', 'error');
  const bulanRaw = document.getElementById('rekapBulan').value;
  const [y, m] = bulanRaw.split('-').map(Number);
  const namaBulan = new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const aoa = [
    ['REKAP BULANAN PELANGGARAN SISWA'],
    ['SMKN 6 Tangerang Selatan'],
    [namaBulan],
    [],
    ['NO', 'NAMA', 'KELAS', 'TELAT (T)', 'ATRIBUT (AT)', 'TOTAL KEJADIAN'],
    ...rekapBulanData.map((d, i) => [i + 1, d.nama, d.kelas, d.telat, d.atribut, d.telat + d.atribut])
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:4},{wch:30},{wch:12},{wch:10},{wch:12},{wch:14}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Bulanan');
  XLSX.writeFile(wb, `Rekap_Bulanan_${bulanRaw}.xlsx`);
  showToast('Berhasil', 'Rekap bulanan berhasil diekspor', 'success');
}

// ===== EXPORT =====

function sortByClass(rows) {
  const JURUSAN = ['RPL','TKJ','BC'];
  const GRADE   = ['X','XI','XII'];
  return [...rows].sort((a, b) => {
    const parse = k => {
      const p = (k||'').split(' ');
      return {
        j: JURUSAN.indexOf(p[1]||''),
        g: GRADE.indexOf(p[0]||''),
        n: parseInt(p[2]||0)
      };
    };
    const ac = parse(a.kelas), bc = parse(b.kelas);
    return ac.j !== bc.j ? ac.j - bc.j : ac.g !== bc.g ? ac.g - bc.g : ac.n - bc.n;
  });
}
function buildExcelSheet(rows, dateObj) {
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][dateObj.getDay()];
  const tgl = dateObj.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });

  const sorted = sortByClass(rows);
  const aoa = [
    ['DAFTAR PELANGGARAN SISWA'],
    ['SMKN 6 Tangerang Selatan'],
    ['TAHUN AJARAN 2025/2026'],
    [],
    ['Tanggal/Hari', hari + ', ' + tgl],
    [],
    ['NO', 'NAMA', 'KELAS', 'KET.', 'KETERANGAN PELANGGARAN'],
    ...sorted.map((d, i) => [i + 1, d.nama, d.kelas, d.pelanggaran, d.detail || ''])
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch:5 }, { wch:32 }, { wch:12 }, { wch:8 }, { wch:35 }];
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:4} },
    { s:{r:1,c:0}, e:{r:1,c:4} },
    { s:{r:2,c:0}, e:{r:2,c:4} },
    { s:{r:4,c:1}, e:{r:4,c:4} },
  ];
  return ws;
}



// ===== DOWNLOAD HELPER - WebView/AppGeyser safe =====
function showDownloadToast(label) {
  // Tampilkan notif "Sedang mengunduh..."
  const id = 'dl_toast_' + Date.now();
  const tc = document.querySelector('.toast-container') || (() => {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  const toast = document.createElement('div');
  toast.id = id;
  toast.className = 'toast info';
  toast.innerHTML = `
    <div class="toast-icon" style="background:rgba(94,184,138,0.1)">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5eb88a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    </div>
    <div>
      <div class="toast-title">Mengunduh ${label}...</div>
      <div class="toast-sub" id="${id}_sub">Menyiapkan file</div>
    </div>`;
  tc.appendChild(toast);
  return id;
}

function finishDownloadToast(id, success, fileName) {
  const toast = document.getElementById(id);
  if (!toast) return;
  const sub = document.getElementById(id + '_sub');
  if (success) {
    toast.classList.add('success');
    toast.querySelector('.toast-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5eb88a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    toast.querySelector('.toast-icon').style.background = 'rgba(94,184,138,0.1)';
    toast.querySelector('.toast-title').textContent = 'Berhasil diunduh';
    if (sub) sub.textContent = fileName;
  } else {
    toast.classList.add('error');
    toast.querySelector('.toast-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e06060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    toast.querySelector('.toast-icon').style.background = 'rgba(224,96,96,0.1)';
    toast.querySelector('.toast-title').textContent = 'Gagal mengunduh';
    if (sub) sub.textContent = 'Hanya bisa melalui web';
  }
  setTimeout(() => { toast.classList.add('hiding'); setTimeout(() => toast.remove(), 340); }, 3000);
}

async function downloadFile(blob, fileName, label) {
  const tid = showDownloadToast(label);
  const sub = document.getElementById(tid + '_sub');
  if (sub) sub.textContent = 'Membuat file...';

  try {
    // ── Metode 1: File System Access API (Chrome 86+ desktop) ───────────
    if (window.showSaveFilePicker) {
      try {
        const ext = fileName.split('.').pop().toLowerCase();
        const types = ext === 'pdf'
          ? [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }]
          : [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }];
        const fh = await window.showSaveFilePicker({ suggestedName: fileName, types });
        const ws = await fh.createWritable();
        if (sub) sub.textContent = 'Menyimpan...';
        await ws.write(blob);
        await ws.close();
        finishDownloadToast(tid, true, fileName);
        return;
      } catch(e) {
        if (e.name === 'AbortError') { finishDownloadToast(tid, false, 'Dibatalkan'); return; }
        // fallthrough ke metode lain
      }
    }

    // ── Metode 2: Share API - ideal untuk WebView/AppGeyser di Android ──
    if (navigator.canShare && navigator.share) {
      try {
        const file = new File([blob], fileName, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          if (sub) sub.textContent = 'Membuka opsi simpan...';
          await navigator.share({ files: [file], title: fileName });
          finishDownloadToast(tid, true, fileName);
          return;
        }
      } catch(e) {
        if (e.name === 'AbortError') { finishDownloadToast(tid, false, 'Dibatalkan'); return; }
        // fallthrough
      }
    }

    // ── Metode 3: <a download> - browser biasa ──────────────────────────
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    if (sub) sub.textContent = 'Mengunduh...';
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    finishDownloadToast(tid, true, fileName);

  } catch(err) {
    console.error('[downloadFile]', err);
    finishDownloadToast(tid, false, 'Hanya bisa melalui web');
  }
}

async function exportExcel() {
  await ensureXLSX();
  if (!filteredData.length) return showToast('Info', 'Tidak ada data untuk diekspor', 'info');
  const ws = buildExcelSheet(filteredData, new Date());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Piket');
  const fileName = 'PiketResimen_' + new Date().toISOString().split('T')[0] + '.xlsx';
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, fileName, 'Excel');
}


async function exportRiwayatPDF() {
  await ensurePDF();
  if (!riwayatData.length) return showToast('Info', 'Tidak ada data', 'info');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const dateVal = document.getElementById('riwayatDate').value;
  const dateObj = new Date(dateVal + 'T00:00:00');
  const date = dateObj.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('DAFTAR PELANGGARAN SISWA', 14, 18);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('SMKN 6 Tangerang Selatan', 14, 25);
  doc.text('Tanggal: ' + date, 14, 31);
  doc.line(14, 34, 196, 34);
  doc.autoTable({
    startY: 38,
    head: [['#','Nama','Kelas','Ket.','Keterangan Pelanggaran','Waktu']],
    body: riwayatData.map((d,i) => [i+1, d.nama, d.kelas, d.pelanggaran, d.detail||'-', formatTime(d.waktu_input)]),
    headStyles: { fillColor:[5,150,105], textColor:255, fontStyle:'bold', fontSize:9 },
    bodyStyles: { fontSize:8 },
    alternateRowStyles: { fillColor:[245,245,255] },
    margin: { left:14, right:14 }
  });
  const fileName = 'Riwayat_' + dateVal + '.pdf';
  const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
  downloadFile(blob, fileName, 'PDF Riwayat');
}

async function exportRiwayatExcel() {
  await ensureXLSX();
  if (!riwayatData.length) return showToast('Info', 'Tidak ada data', 'info');
  const dateVal = document.getElementById('riwayatDate').value;
  const dateObj = new Date(dateVal + 'T00:00:00');
  const ws = buildExcelSheet(riwayatData, dateObj);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Riwayat');
  const fileName = 'Riwayat_' + dateVal + '.xlsx';
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, fileName, 'Excel Riwayat');
}

async function exportPDF() {
  await ensurePDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });

  doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text('PIKET RESIMEN', 14, 18);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Data Siswa Telat dan Tidak Lengkap', 14, 25);
  doc.text(`Tanggal: ${date}`, 14, 31);
  doc.line(14, 34, 196, 34);

  const rows = filteredData.map((d, i) => [
    i + 1, d.nama, d.kelas, d.pelanggaran, d.detail || '-', formatTime(d.waktu_input)
  ]);

  doc.autoTable({
    startY: 38,
    head: [['#', 'Nama', 'Kelas', 'Pelanggaran', 'Detail', 'Waktu']],
    body: rows,
    headStyles: { fillColor: [108, 61, 232], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    margin: { left: 14, right: 14 }
  });

  doc.setFontSize(8); doc.setTextColor(150);
  doc.text(`Total: ${filteredData.length} data · Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, doc.internal.pageSize.height - 10);
  const fileName = `PiketResimen_${new Date().toISOString().split('T')[0]}.pdf`;
  const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
  downloadFile(blob, fileName, 'PDF');
}



// ===== STUDENT DATABASE =====
const STUDENTS = window.__DEMO_STUDENTS || [];
// ===== AUTOCOMPLETE =====
let acActiveIdx = -1;
let acResults = [];

function onNamaInput(val) {
  acActiveIdx = -1;
  const drop = document.getElementById('namaDropdown');
  if (!val || val.length < 2) { drop.classList.remove('open'); return; }

  const q = val.toLowerCase();
  acResults = STUDENTS.filter(s => s.nama.toLowerCase().includes(q)).slice(0, 20);

  if (!acResults.length) {
    drop.innerHTML = '<div class="autocomplete-empty">Siswa tidak ditemukan</div>';
    drop.classList.add('open'); return;
  }

  drop.innerHTML = acResults.map((s, i) => {
    const highlighted = s.nama.replace(new RegExp(val.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'),
      m => `<mark>${m}</mark>`);
    return `<div class="autocomplete-item" data-idx="${i}" onmousedown="selectStudent(${i})">
      <span class="autocomplete-name">${highlighted}</span>
      <span class="autocomplete-kelas">${s.kelas}</span>
    </div>`;
  }).join('');
  drop.classList.add('open');
}

function onNamaKey(e) {
  const drop = document.getElementById('namaDropdown');
  const items = drop.querySelectorAll('.autocomplete-item');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    acActiveIdx = Math.min(acActiveIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    acActiveIdx = Math.max(acActiveIdx - 1, 0);
  } else if (e.key === 'Enter' && acActiveIdx >= 0) {
    e.preventDefault();
    selectStudent(acActiveIdx); return;
  } else if (e.key === 'Escape') {
    drop.classList.remove('open'); return;
  } else return;

  items.forEach((el, i) => el.classList.toggle('active', i === acActiveIdx));
  items[acActiveIdx]?.scrollIntoView({block:'nearest'});
}

function selectStudent(idx) {
  const s = acResults[idx];
  if (!s) return;
  document.getElementById('inputNama').value = s.nama;
  document.getElementById('inputKelas').value = s.kelas;
  document.getElementById('namaDropdown').classList.remove('open');
  // Highlight kelas select briefly
  const kel = document.getElementById('inputKelas');
  kel.style.borderColor = 'var(--cyan)';
  kel.style.boxShadow = '0 0 0 3px rgba(6,214,224,0.15)';
  setTimeout(() => { kel.style.borderColor = ''; kel.style.boxShadow = ''; }, 1200);
}

// Close dropdown when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrap')) {
    document.getElementById('namaDropdown')?.classList.remove('open');
  }
});

// ===== JADWAL PIKET (DYNAMIC, stored in Supabase) =====
const HARI_LIST = ['Senin','Selasa','Rabu','Kamis','Jumat'];
let cachedJadwal = {};

function getJadwal() { return cachedJadwal; }

async function loadJadwalFromDB() {
  if (demoMode) return;
  try {
    const { data, error } = await window._supa.from('jadwal_piket').select('*');
    if (error) { console.warn('[loadJadwalFromDB] DB error:', error.message); throw new Error('Gagal memuat jadwal'); }
    const j = {};
    (data||[]).forEach(row => {
      j[row.hari] = { pj: row.pj, kegiatan: row.kegiatan||[], gerbang: row.gerbang||[] };
    });
    cachedJadwal = j;
    renderJadwal();
    loadAbsensi();
    if (!document.getElementById('page-admin')?.classList.contains('active')) {
      renderAdminForm();
    }
  } catch(e) { console.warn('loadJadwalFromDB error:', e.message); }
}

async function saveJadwal(data) {
  // Auth guard - hanya sekretaris yang bisa ubah jadwal
  if (!currentRole || currentRole !== 'sekretaris') {
    showToast('Akses Ditolak', 'Hanya Sekretaris yang dapat mengubah jadwal', 'error');
    return;
  }
  cachedJadwal = data;
  if (demoMode) return;
  const rows = Object.entries(data).map(([hari, v]) => ({
    hari,
    pj:       v.pj || '',
    kegiatan: Array.isArray(v.kegiatan) ? v.kegiatan : [],
    gerbang:  Array.isArray(v.gerbang)  ? v.gerbang  : []
  }));
  try {
    await apiWrite({
      table: 'jadwal_piket',
      action: 'jadwal_save',
      data: rows
    });
  } catch(e) {
    console.warn('[saveJadwal] error:', e.message);
    showToast('Error', e.message || 'Gagal simpan jadwal', 'error');
  }
}

const HARI_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function getHariIni() {
  return HARI_ID[new Date().getDay()];
}

function initials(name) {
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

function renderJadwal() {
  const hari = getHariIni();
  const badge = document.getElementById('jadwalDayBadge');
  const content = document.getElementById('jadwalContent');
  if (badge) badge.textContent = hari + ', ' + new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

  const jadwal = getJadwal();
  const d = jadwal[hari];

  if (!d || (!d.pj && !d.kegiatan?.length && !d.gerbang?.length)) {
    const isWeekend = !['Senin','Selasa','Rabu','Kamis','Jumat'].includes(hari);
    content.innerHTML = `<div class="jadwal-libur">
      <i data-lucide="${isWeekend ? 'coffee' : 'calendar-x'}" style="width:28px;height:28px;color:var(--purple-soft)"></i>
      <div style="font-weight:600;color:var(--white)">${isWeekend ? 'Tidak ada piket hari ini' : 'Jadwal belum diisi'}</div>
      <div style="font-size:12px">${isWeekend ? 'Selamat beristirahat!' : 'Admin Sekretaris dapat mengisi jadwal di menu Admin.'}</div>
    </div>`;
    lucide.createIcons(); return;
  }

  content.innerHTML = `<div class="jadwal-grid">
    <div class="jadwal-col">
      <div class="jadwal-col-title pj"><i data-lucide="star" style="width:13px;height:13px"></i> Penanggung Jawab</div>
      ${d.pj ? `<div class="jadwal-member"><div class="jadwal-avatar pj">${initials(d.pj)}</div><span>${escHtml(d.pj)}</span></div>` : '<div class="jadwal-member" style="color:rgba(240,244,255,0.3);font-size:12px">Belum diisi</div>'}
    </div>
    <div class="jadwal-col">
      <div class="jadwal-col-title keg"><i data-lucide="clipboard-list" style="width:13px;height:13px"></i> Piket Kegiatan</div>
      ${(d.kegiatan||[]).length ? (d.kegiatan||[]).map(n=>`<div class="jadwal-member"><div class="jadwal-avatar keg">${initials(n)}</div><span>${escHtml(n)}</span></div>`).join('') : '<div class="jadwal-member" style="color:rgba(240,244,255,0.3);font-size:12px">Belum diisi</div>'}
    </div>
    <div class="jadwal-col">
      <div class="jadwal-col-title gerb"><i data-lucide="door-open" style="width:13px;height:13px"></i> Piket Gerbang</div>
      ${(d.gerbang||[]).length ? (d.gerbang||[]).map(n=>`<div class="jadwal-member"><div class="jadwal-avatar gerb">${initials(n)}</div><span>${escHtml(n)}</span></div>`).join('') : '<div class="jadwal-member" style="color:rgba(240,244,255,0.3);font-size:12px">Belum diisi</div>'}
    </div>
  </div>`;
  lucide.createIcons();
}

// ===== PROFIL LOKAL (per-perangkat, tersimpan di localStorage) =====
const PROFILE_NAME_KEY = 'piketku_profile_name';
const PROFILE_PHOTO_KEY = 'piketku_profile_photo';

function getProfileName() {
  return (localStorage.getItem(PROFILE_NAME_KEY) || '').trim();
}
function getProfilePhoto() {
  return localStorage.getItem(PROFILE_PHOTO_KEY) || '';
}

function renderProfileAvatar(el, size) {
  if (!el) return;
  const photo = getProfilePhoto();
  const name = getProfileName();
  if (photo) {
    el.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;" alt="Foto profil">`;
  } else if (name) {
    el.textContent = initials(name);
  } else {
    el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(size*0.55)}" height="${Math.round(size*0.55)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
}

function applyProfileEverywhere() {
  renderProfileAvatar(document.getElementById('profileAvatarPreview'), 56);
  renderProfileAvatar(document.getElementById('navProfileAvatar'), 30);
  const nameInput = document.getElementById('profileNameInput');
  if (nameInput && !nameInput.value) nameInput.value = getProfileName();
  const dn = document.getElementById('profileDisplayName');
  if (dn) dn.textContent = getProfileName() || 'Pengguna';
  const rl = document.getElementById('profileRoleLabel');
  if (rl) rl.textContent = (currentRole && ROLES[currentRole]) ? ROLES[currentRole].label : '-';
}

function toggleProfileEditor() {
  const ed = document.getElementById('pfEditor');
  const row = document.getElementById('pfManageRow');
  if (!ed || !row) return;
  const open = ed.hidden;
  ed.hidden = !open;
  row.setAttribute('aria-expanded', String(open));
  row.classList.toggle('is-open', open);
  if (open) {
    const inp = document.getElementById('profileNameInput');
    if (inp) { inp.value = getProfileName(); inp.focus({ preventScroll: true }); }
  }
}

function toggleLangFromProfile() {
  setLang(currentLang === 'id' ? 'en' : 'id');
}

function handleProfilePhotoChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Gagal', 'File yang dipilih bukan gambar', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('Gagal', 'Ukuran foto maksimal 2MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    // Kompres/resize agar hemat localStorage
    const img = new Image();
    img.onload = () => {
      const size = 200;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      try {
        localStorage.setItem(PROFILE_PHOTO_KEY, dataUrl);
        applyProfileEverywhere();
        showToast('Berhasil', 'Foto profil diperbarui', 'success');
      } catch (e) {
        showToast('Gagal', 'Penyimpanan browser penuh, coba foto lain', 'error');
      }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function clearProfilePhoto() {
  localStorage.removeItem(PROFILE_PHOTO_KEY);
  applyProfileEverywhere();
  showToast('Terhapus', 'Foto profil dihapus', 'success');
}

function saveProfileInfo() {
  const nameInput = document.getElementById('profileNameInput');
  const name = (nameInput ? nameInput.value : '').trim();
  if (name) {
    localStorage.setItem(PROFILE_NAME_KEY, name);
  } else {
    localStorage.removeItem(PROFILE_NAME_KEY);
  }
  applyProfileEverywhere();
  showToast('Tersimpan', 'Profil kamu sudah diperbarui', 'success');
  const ed = document.getElementById('pfEditor');
  if (ed && !ed.hidden) toggleProfileEditor();
}

window.handleProfilePhotoChange = typeof handleProfilePhotoChange !== "undefined" ? handleProfilePhotoChange : function(){};
window.clearProfilePhoto = typeof clearProfilePhoto !== "undefined" ? clearProfilePhoto : function(){};
window.toggleProfileEditor = toggleProfileEditor;
window.toggleLangFromProfile = toggleLangFromProfile;
window.saveProfileInfo = typeof saveProfileInfo !== "undefined" ? saveProfileInfo : function(){};

// ===== ONESIGNAL PUSH NOTIFICATIONS =====
function updatePushStatusUI(isSubscribed) {
  const statusText = document.getElementById('pushStatusText');
  const btn = document.getElementById('pushEnableBtn');
  if (!statusText || !btn) return;
  const en = (typeof currentLang !== 'undefined' && currentLang === 'en');
  if (isSubscribed) {
    statusText.textContent = en ? 'On' : 'Aktif';
    btn.classList.add('is-on');
    btn.disabled = true;
  } else {
    statusText.textContent = en ? 'Off' : 'Belum aktif';
    btn.classList.remove('is-on');
    btn.disabled = false;
  }
}

function enableOneSignalPush() {
  if (!window.OneSignalDeferred) {
    showToast('Gagal', 'Modul notifikasi belum siap, coba lagi sebentar', 'error');
    return;
  }
  OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (Notification.permission === 'denied') {
        showToast('Diblokir', 'Izin notifikasi diblokir di browser. Aktifkan lewat pengaturan browser/situs.', 'error');
        return;
      }
      await OneSignal.Notifications.requestPermission();
      const subscribed = OneSignal.User.PushSubscription.optedIn;
      updatePushStatusUI(!!subscribed);
      if (subscribed) {
        showToast('Berhasil', 'Notifikasi push diaktifkan', 'success');
      }
    } catch (e) {
      showToast('Gagal', 'Tidak bisa mengaktifkan notifikasi', 'error');
    }
  });
}

function initOneSignalStatusCheck() {
  if (!window.OneSignalDeferred) return;
  OneSignalDeferred.push(async function (OneSignal) {
    try {
      const subscribed = OneSignal.User.PushSubscription.optedIn;
      updatePushStatusUI(!!subscribed);
      OneSignal.User.PushSubscription.addEventListener('change', (event) => {
        updatePushStatusUI(!!(event && event.current && event.current.optedIn));
      });
    } catch (e) { /* noop */ }
  });
}

window.enableOneSignalPush = typeof enableOneSignalPush !== "undefined" ? enableOneSignalPush : function(){};

function closeWelcomeAndGo() {
  document.getElementById('welcomeModal').classList.remove('open');
  if (currentRole === 'sekretaris') {
    navigateTo('admin', document.getElementById('adminSidebarBtn'));
    setTimeout(() => switchAdminTab('Sekretaris'), 150);
  }
  // Guru: tetap di Dashboard, tidak lagi auto-redirect ke Panel Guru
}

function showWelcomePopup() {
  const hari = getHariIni();
  const now = new Date();
  const tanggal = now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('welcomeDay').textContent = tanggal;

  applyProfileEverywhere();
  const profileName = getProfileName();
  const profilePhoto = getProfilePhoto();
  const greetingEl = document.getElementById('welcomeGreeting');
  if (greetingEl) {
    greetingEl.innerHTML = profileName
      ? `Halo, <span>${profileName}!</span>`
      : `Selamat <span>Bertugas!</span>`;
  }
  const glowImg = document.getElementById('welcomeGlowImg');
  if (glowImg) {
    if (profilePhoto) {
      glowImg.src = profilePhoto;
      glowImg.style.borderRadius = '50%';
      glowImg.style.objectFit = 'cover';
    } else {
      glowImg.src = 'demo-assets/icon-192.png';
      glowImg.style.borderRadius = '0';
      glowImg.style.objectFit = 'contain';
    }
  }

  const tugas = document.getElementById('welcomeTugas');
  const jadwal = getJadwal();
  const d = jadwal[hari];
  if (!d || (!d.pj && !d.kegiatan?.length && !d.gerbang?.length)) {
    tugas.innerHTML = `<div class="welcome-tugas-title">Status Hari Ini</div>
      <div class="welcome-member-row" style="justify-content:center;color:var(--white-dim)">Jadwal belum diisi Admin Sekretaris</div>`;
  } else {
    tugas.innerHTML = `<div class="welcome-tugas-title">Tim Piket Hari Ini</div>
      ${d.pj ? `<div class="welcome-member-row"><div class="jadwal-avatar pj" style="width:24px;height:24px;font-size:9px">${initials(d.pj)}</div><span>${escHtml(d.pj)}</span><span class="welcome-member-role">Penanggung Jawab</span></div>` : ''}
      ${(d.kegiatan||[]).map(n=>`<div class="welcome-member-row"><div class="jadwal-avatar keg" style="width:24px;height:24px;font-size:9px">${initials(n)}</div><span>${escHtml(n)}</span><span class="welcome-member-role">Piket Kegiatan</span></div>`).join('')}
      ${(d.gerbang||[]).map(n=>`<div class="welcome-member-row"><div class="jadwal-avatar gerb" style="width:24px;height:24px;font-size:9px">${initials(n)}</div><span>${escHtml(n)}</span><span class="welcome-member-role">Piket Gerbang</span></div>`).join('')}`;
  }
  document.getElementById('welcomeModal').classList.add('open');
  lucide.createIcons();
}


// ===== ADMIN SEKRETARIS =====
// Akses halaman admin dilindungi verifikasi serverless
let adminUnlocked = false;

function openAdminPage() {
  // Verifikasi role sebelum buka halaman admin
  if (currentRole !== 'sekretaris') {
    showToast('Akses Ditolak', 'Hanya Sekretaris yang dapat mengakses halaman ini', 'error');
    return;
  }
  if (adminUnlocked) {
    navigateTo('admin', document.getElementById('adminSidebarBtn'));
    renderAdminForm();
  } else {
    document.getElementById('adminLockModal').classList.add('open');
    setTimeout(() => document.getElementById('adminPwInput')?.focus(), 300);
  }
}

async function verifyAdmin() {
  // Paksa role check dulu
  if (currentRole !== 'sekretaris') {
    showToast('Akses Ditolak', 'Tidak diizinkan', 'error');
    document.getElementById('adminLockModal').classList.remove('open');
    return;
  }

  const pw = document.getElementById('adminPwInput').value || 'demo'; // [WEB DEMO] password bebas
  if (pw.length > 128) {
    showToast('Validasi', 'Password tidak valid', 'error');
    return;
  }

  // Rate limiting untuk admin verify
  const rl = _RateLimit.check('admin_verify');
  if (!rl.allowed) {
    document.getElementById('adminPwInput').value = '';
    return showToast('Terlalu banyak percobaan', `Coba lagi dalam ${rl.remaining} detik`, 'error');
  }
  _RateLimit.increment('admin_verify');

  let verified = false;

  // Verifikasi via endpoint serverless (/api/login)
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'sekretaris', password: pw })
    });

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      const data = await res.json().catch(() => null);
      if (data && typeof data.ok === 'boolean') {
        verified = (res.ok && data.ok === true);
        if (verified && data.token) {
          sessionStorage.setItem('piket_token', data.token);
        }
      }
    } else {
      return showToast('Error', 'Tidak bisa memverifikasi password saat offline', 'error');
    }
  } catch (err) {
    console.warn('[admin] Serverless login endpoint unreachable:', err);
    return showToast('Error', 'Tidak bisa memverifikasi password saat offline', 'error');
  }

  if (verified) {
    _RateLimit.reset('admin_verify');
    adminUnlocked = true;
    document.getElementById('adminLockModal').classList.remove('open');
    document.getElementById('adminPwInput').value = '';
    navigateTo('admin', document.getElementById('adminSidebarBtn'));
    renderAdminForm();
    showToast('Selamat datang!', 'Akses Admin Sekretaris diberikan', 'success');
  } else {
    showToast('Akses Ditolak', 'Password salah', 'error');
    document.getElementById('adminPwInput').value = '';
    document.getElementById('adminPwInput').focus();
  }
}

let adminSaveTimer = null;
function scheduleAutoSave() {
  clearTimeout(adminSaveTimer);
  adminSaveTimer = setTimeout(() => {
    saveAdminJadwal(true); // true = silent (no toast)
  }, 2000);
}

function makeNameSlot(id, value, placeholder) {
  return `<div class="name-slot-wrap autocomplete-wrap">
    <input type="text" class="form-input" id="${id}" value="${escHtml(value)}"
      placeholder="${placeholder}" autocomplete="off" style="font-size:13px"
      oninput="acAdmin(this);scheduleAutoSave()" onfocus="acAdmin(this)" onkeydown="acAdminKey(event,this)"/>
    <div class="autocomplete-dropdown" id="drop_${id}"></div>
  </div>`;
}

function makeSlots(prefix, names, count) {
  return Array.from({length: count}, (_, i) =>
    makeNameSlot(prefix+'_'+i, names[i]||'', 'Nama '+(i+1)+'...')
  ).join('');
}

function renderAdminForm() {
  const jadwal = getJadwal();
  const container = document.getElementById('adminDayCards');
  container.innerHTML = HARI_LIST.map(hari => {
    const d = jadwal[hari] || {};
    const keg  = d.kegiatan || [];
    const gerb = d.gerbang  || [];
    return `<div class="admin-day-card">
      <div class="admin-day-header">
        <div class="admin-day-title">
          <i data-lucide="calendar-days" style="width:16px;height:16px;color:var(--cyan)"></i>
          ${hari}
        </div>
        <button class="btn-reset-day" onclick="resetDay('${hari}')">Kosongkan</button>
      </div>
      <div class="admin-day-body">
        <div>
          <div class="admin-field-label">Penanggung Jawab (XI)</div>
          ${makeNameSlot('pj_'+hari, d.pj||'', 'Nama penanggung jawab...')}
        </div>
        <div>
          <div class="admin-field-label">Piket Kegiatan</div>
          <div class="name-slots">${makeSlots('keg_'+hari, keg, 4)}</div>
        </div>
        <div>
          <div class="admin-field-label">Piket Gerbang</div>
          <div class="name-slots">${makeSlots('gerb_'+hari, gerb, 4)}</div>
        </div>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

// Admin autocomplete state
let acAdminActive = -1;
let acAdminResults = [];
let acAdminCurrentInput = null;

function acAdmin(el) {
  acAdminActive = -1;
  acAdminCurrentInput = el;
  const val = el.value.trim();
  const dropId = 'drop_' + el.id;
  const drop = document.getElementById(dropId);
  if (!drop) return;
  if (!val || val.length < 2) { drop.classList.remove('open'); return; }

  const q = val.toLowerCase();
  acAdminResults = STUDENTS.filter(s => s.nama.toLowerCase().includes(q)).slice(0, 12);

  if (!acAdminResults.length) {
    drop.innerHTML = '<div class="autocomplete-empty">Tidak ditemukan</div>';
    drop.classList.add('open'); return;
  }

  drop.innerHTML = acAdminResults.map((s, i) => {
    const hl = s.nama.replace(new RegExp(val.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'), m=>`<mark>${m}</mark>`);
    return `<div class="autocomplete-item" data-idx="${i}" onmousedown="acAdminSelect(${i},'${el.id}')">
      <span class="autocomplete-name">${hl}</span>
      <span class="autocomplete-kelas">${s.kelas}</span>
    </div>`;
  }).join('');
  drop.classList.add('open');
}

function acAdminKey(e, el) {
  const drop = document.getElementById('drop_' + el.id);
  if (!drop) return;
  const items = drop.querySelectorAll('.autocomplete-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); acAdminActive = Math.min(acAdminActive+1, items.length-1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); acAdminActive = Math.max(acAdminActive-1, 0); }
  else if (e.key === 'Enter' && acAdminActive >= 0) { e.preventDefault(); acAdminSelect(acAdminActive, el.id); return; }
  else if (e.key === 'Escape') { drop.classList.remove('open'); return; }
  else return;
  items.forEach((item, i) => item.classList.toggle('active', i === acAdminActive));
  items[acAdminActive]?.scrollIntoView({block:'nearest'});
}

function acAdminSelect(idx, inputId) {
  const s = acAdminResults[idx];
  if (!s) return;
  const el = document.getElementById(inputId);
  if (el) el.value = s.nama;
  const drop = document.getElementById('drop_' + inputId);
  if (drop) drop.classList.remove('open');
}

// Close admin dropdowns on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.name-slot-wrap')) {
    document.querySelectorAll('.name-slot-wrap .autocomplete-dropdown').forEach(d => d.classList.remove('open'));
  }
});

function saveAdminJadwal(silent=false) {
  const jadwal = {};
  HARI_LIST.forEach(hari => {
    const pj = sanitizeInput(document.getElementById('pj_'+hari)?.value.trim() || '');
    const kegiatan = [0,1,2,3].map(i => sanitizeInput(document.getElementById('keg_'+hari+'_'+i)?.value.trim()||'')).filter(Boolean);
    const gerbang  = [0,1,2,3].map(i => sanitizeInput(document.getElementById('gerb_'+hari+'_'+i)?.value.trim()||'')).filter(Boolean);
    jadwal[hari] = { pj, kegiatan, gerbang };
  });
  saveJadwal(jadwal);
  renderJadwal();
  if (!silent) showToast('Tersimpan!', 'Jadwal piket berhasil diperbarui', 'success');
}

// ===== UPDATE 2.0.2 - ISI JADWAL PIKET DARI GAMBAR =====
// Gambar dikecilkan di browser, dikirim ke /api/parse-jadwal (khusus sekretaris),
// hasilnya hanya DIISIKAN ke form sebagai draft. Penyimpanan tetap lewat tombol
// Simpan (saveAdminJadwal -> /api/write), tidak ada auto-save dari hasil gambar.
const JADWAL_IMG_MIN_SIDE = 2000; // gambar kecil diperbesar supaya tulisan kecil terbaca
const JADWAL_IMG_MAX_SIDE = 2400;
let jadwalImportBusy = false;

function setJadwalImportStatus(msg, type) {
  const el = document.getElementById('jadwalImportStatus');
  if (!el) return;
  if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
  el.className = 'import-status ' + (type || '');
  el.textContent = msg;
  el.style.display = 'block';
}

function fileToResizedBase64(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      // Perbesar gambar kecil, kecilkan gambar raksasa
      const target = Math.min(JADWAL_IMG_MAX_SIDE, Math.max(JADWAL_IMG_MIN_SIDE, longest));
      const scale = target / longest;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      // PNG menjaga tulisan tetap tajam; kalau terlalu besar, pakai JPEG kualitas tinggi
      let mediaType = 'image/png';
      let dataUrl = canvas.toDataURL(mediaType);
      if (dataUrl.length > 3.2 * 1024 * 1024) {
        mediaType = 'image/jpeg';
        dataUrl = canvas.toDataURL(mediaType, 0.93);
      }
      resolve({ base64: dataUrl.split(',')[1], mediaType });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibuka')); };
    img.src = url;
  });
}

function fillAdminFormFromParsed(list) {
  list.forEach(d => {
    if (!HARI_LIST.includes(d.hari)) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    set('pj_' + d.hari, d.pj);
    [0, 1, 2, 3].forEach(i => {
      set('keg_' + d.hari + '_' + i, (d.kegiatan || [])[i]);
      set('gerb_' + d.hari + '_' + i, (d.gerbang || [])[i]);
    });
  });
}

// ----- Pencocokan nama ke daftar siswa (STUDENTS) -----
// Nama dipecah jadi kata (huruf/angka saja), jadi "M.Gilank" == "M. Gilank" dan
// singkatan seperti ".S" atau ".R" bisa cocok dengan kata berawalan huruf itu.
function _tokNama(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

function _editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Kemiripan dua kata: 1 sama persis, 0.8 singkatan 1 huruf, ~0.9 beda 1-2 huruf, 0 tidak mirip
function _tokSim(q, c) {
  if (q === c) return 1;
  if (q.length === 1) return c[0] === q ? 0.8 : 0;
  const d = _editDistance(q, c);
  const maxLen = Math.max(q.length, c.length);
  if (maxLen >= 4 && d <= 1) return 1 - d / (maxLen + 1);
  if (maxLen >= 8 && d <= 2) return 1 - d / (maxLen + 1);
  return 0;
}

let _rosterTokCache = null;
function _rosterTokens() {
  if (!_rosterTokCache || _rosterTokCache.length !== STUDENTS.length) {
    _rosterTokCache = STUDENTS.map(s => ({ nama: s.nama, toks: _tokNama(s.nama) }));
  }
  return _rosterTokCache;
}

// Cocokkan satu nama hasil baca gambar dengan daftar siswa.
// Hasil: { type: 'exact' | 'fixed' | 'unknown', nama, near }
//  exact   = kata-katanya sama persis dengan data siswa (ejaan disamakan ke data)
//  fixed   = hampir sama dan hanya ada satu kandidat yang jelas, dikoreksi otomatis
//  unknown = tidak yakin, dibiarkan apa adanya dan ditandai (near = saran terdekat)
function matchStudentName(input) {
  const q = _tokNama(input);
  if (!q.length) return { type: 'unknown', nama: input, near: null };
  const roster = _rosterTokens();
  const key = q.join(' ');
  for (const r of roster) {
    if (r.toks.join(' ') === key) return { type: 'exact', nama: r.nama, near: null };
  }
  if (q.length < 2) return { type: 'unknown', nama: input, near: null };

  const scored = [];
  for (const r of roster) {
    const c = r.toks;
    if (c.length < q.length || c.length > q.length + 2) continue;
    const used = new Set();
    let sum = 0;
    for (const qt of q) {
      let bestJ = -1, bestS = 0;
      c.forEach((ct, j) => {
        if (used.has(j)) return;
        const sim = _tokSim(qt, ct);
        if (sim > bestS) { bestS = sim; bestJ = j; }
      });
      if (bestJ >= 0) { used.add(bestJ); sum += bestS; }
    }
    scored.push({ nama: r.nama, score: sum / q.length });
  }
  scored.sort((x, y) => y.score - x.score);
  const top = scored[0], second = scored[1];
  if (top && top.score >= 0.9 && (!second || top.score - second.score >= 0.08)) {
    return { type: 'fixed', nama: top.nama, near: null };
  }
  return { type: 'unknown', nama: input, near: top && top.score >= 0.6 ? top.nama : null };
}

function fillAdminFormFromParsed(list) {
  list.forEach(d => {
    if (!HARI_LIST.includes(d.hari)) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    set('pj_' + d.hari, d.pj);
    [0, 1, 2, 3].forEach(i => {
      set('keg_' + d.hari + '_' + i, (d.kegiatan || [])[i]);
      set('gerb_' + d.hari + '_' + i, (d.gerbang || [])[i]);
    });
  });
}

// Samakan semua nama di form dengan daftar siswa: yang cocok dibetulkan otomatis
// (ditandai biru), yang tidak yakin dibiarkan dan ditandai kuning. Juga mengumpulkan
// hari yang jumlah petugasnya kurang dari 4.
function verifyAdminFormAgainstRoster(list) {
  const fixed = [];
  const unknown = [];
  const shortDays = [];
  document.querySelectorAll('#adminDayCards input.form-input').forEach(el => {
    el.classList.remove('import-warn', 'import-fixed');
    el.removeAttribute('title');
    if (!el.dataset.warnBound) {
      el.dataset.warnBound = '1';
      el.addEventListener('input', () => { el.classList.remove('import-warn', 'import-fixed'); el.removeAttribute('title'); });
    }
  });
  list.forEach(d => {
    if (!HARI_LIST.includes(d.hari)) return;
    const ids = ['pj_' + d.hari];
    [0, 1, 2, 3].forEach(i => { ids.push('keg_' + d.hari + '_' + i, 'gerb_' + d.hari + '_' + i); });
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) return;
      const original = el.value.trim();
      const m = matchStudentName(original);
      if (m.type === 'exact') {
        el.value = m.nama;
      } else if (m.type === 'fixed') {
        el.value = m.nama;
        el.classList.add('import-fixed');
        el.title = 'Dikoreksi otomatis dari "' + original + '"';
        fixed.push(d.hari + ': ' + original + ' menjadi ' + m.nama);
      } else {
        el.classList.add('import-warn');
        el.title = m.near ? 'Tidak ada di daftar siswa. Mungkin maksudnya: ' + m.near : 'Tidak ada di daftar siswa, cek ejaan';
        unknown.push(d.hari + ': ' + original + (m.near ? ' (mungkin ' + m.near + ')' : ''));
      }
    });
    if ((d.kegiatan || []).length < 4 || (d.gerbang || []).length < 4) {
      shortDays.push(d.hari + ' (kegiatan ' + (d.kegiatan || []).length + ', gerbang ' + (d.gerbang || []).length + ')');
    }
  });
  const missingDays = HARI_LIST.filter(h => !list.some(d => d.hari === h));
  return { fixed, unknown, shortDays, missingDays };
}

async function onJadwalImagePicked(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if (currentRole !== 'sekretaris') {
    showToast('Akses Ditolak', 'Hanya Sekretaris yang dapat mengisi jadwal', 'error');
    return;
  }
  if (jadwalImportBusy) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    setJadwalImportStatus('Format harus JPG, PNG, atau WebP.', 'error');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    setJadwalImportStatus('Gambar terlalu besar (maksimal 15 MB).', 'error');
    return;
  }
  if (navigator.onLine === false) {
    setJadwalImportStatus('Perlu koneksi internet untuk membaca gambar.', 'error');
    return;
  }
  const token = sessionStorage.getItem('piket_token');
  if (!token) {
    showToast('Akses Ditolak', 'Sesi login berakhir, silakan login ulang', 'error');
    return;
  }

  const nameEl = document.getElementById('jadwalImageName');
  const btn = document.getElementById('btnPickJadwalImage');
  if (nameEl) nameEl.textContent = file.name;
  jadwalImportBusy = true;
  if (btn) btn.disabled = true;
  setJadwalImportStatus('Membaca gambar, mohon tunggu sebentar...', 'loading');

  try {
    const { base64, mediaType } = await fileToResizedBase64(file);
    const res = await fetch('/api/parse-jadwal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, image: base64, mediaType })
    });
    let json = null;
    try { json = await res.json(); } catch (e) {}
    if (!res.ok || !json || !json.ok) {
      setJadwalImportStatus((json && json.error) || 'Gagal membaca gambar. Coba lagi atau isi manual.', 'error');
      return;
    }
    const existing = document.querySelectorAll('#adminDayCards input.form-input');
    const hasData = Array.from(existing).some(i => i.value.trim());
    if (hasData && !confirm('Isi form saat ini akan diganti hasil bacaan gambar. Lanjutkan?')) {
      setJadwalImportStatus('Dibatalkan. Form tidak diubah.', '');
      return;
    }
    fillAdminFormFromParsed(json.jadwal);
    const chk = verifyAdminFormAgainstRoster(json.jadwal);
    const n = json.jadwal.length;
    const modelNote = json.model ? ' (dibaca oleh ' + String(json.model).slice(0, 60) + ')' : '';
    const notes = [];
    if (chk.fixed.length) notes.push(chk.fixed.length + ' nama dikoreksi otomatis sesuai daftar siswa (kotak biru)');
    if (chk.unknown.length) notes.push(chk.unknown.length + ' nama tidak ditemukan di daftar siswa dan perlu dicek manual (kotak kuning): ' + chk.unknown.slice(0, 6).join('; ') + (chk.unknown.length > 6 ? ' dan lainnya' : ''));
    if (chk.shortDays.length) notes.push('Jumlah petugas kurang dari 4 di: ' + chk.shortDays.join(', '));
    if (chk.missingDays.length) notes.push('Hari tidak terbaca: ' + chk.missingDays.join(', '));
    if (chk.unknown.length || chk.shortDays.length || chk.missingDays.length) {
      setJadwalImportStatus('Terbaca ' + n + ' hari' + modelNote + '. ' + notes.join('. ') + '. Bandingkan dengan gambar, perbaiki yang salah, lalu klik Simpan Semua Jadwal.', 'warn');
      showToast('Perlu dicek', 'Ada nama yang belum pasti, cek sebelum menyimpan', 'info');
    } else {
      setJadwalImportStatus('Berhasil membaca ' + n + ' hari' + modelNote + '. ' + (notes.length ? notes.join('. ') + '. ' : 'Semua nama cocok dengan daftar siswa. ') + 'Bandingkan sekilas dengan gambar, lalu klik Simpan Semua Jadwal.', 'success');
      showToast('Gambar terbaca', 'Periksa dulu lalu klik Simpan Semua Jadwal', 'success');
    }
  } catch (e) {
    console.warn('[onJadwalImagePicked] error:', e && e.message);
    setJadwalImportStatus('Gagal memproses gambar. Coba gambar lain atau isi manual.', 'error');
  } finally {
    jadwalImportBusy = false;
    if (btn) btn.disabled = false;
  }
}

function resetDay(hari) {
  document.getElementById('pj_'+hari)?.value && (document.getElementById('pj_'+hari).value='');
  [0,1,2,3].forEach(i => {
    const k = document.getElementById('keg_'+hari+'_'+i);
    const g = document.getElementById('gerb_'+hari+'_'+i);
    if(k) k.value='';
    if(g) g.value='';
  });
}

async function clearAllJadwal() {
  // Auth guard
  if (!currentRole || currentRole !== 'sekretaris') {
    showToast('Akses Ditolak', 'Hanya Sekretaris yang dapat menghapus jadwal', 'error');
    return;
  }
  if (!confirm('Hapus semua jadwal piket?')) return;
  cachedJadwal = {};
  if (!demoMode) {
    try {
      await apiWrite({
        table: 'jadwal_piket',
        action: 'delete'
      });
    } catch(e) {
      console.warn('[clearAllJadwal] error:', e.message);
      showToast('Error', e.message || 'Gagal hapus jadwal', 'error');
      return;
    }
  }
  renderAdminForm();
  renderJadwal();
  showToast('Jadwal dihapus', 'Semua jadwal dikosongkan', 'info');
}

// ===== LOGIN / LOGOUT =====
function selectRole(role) {
  selectedLoginRole = role;
  const r = ROLES[role];
  document.getElementById('loginStep1').style.display = 'none';
  document.getElementById('loginStep2').style.display = 'block';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginRoleLabel').innerHTML = `
    <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center">
      <i data-lucide="${r.icon}" style="width:18px;height:18px;color:${r.color}"></i>
    </div>
    <div>
      <div style="font-size:13px;font-weight:600;color:var(--white)">${r.label}</div>
      <div style="font-size:11px;color:var(--white-dim)">Masukkan password untuk melanjutkan</div>
    </div>`;
  lucide.createIcons();
  // Set hidden username field so Chrome can save per-role password
  const roleInput = document.getElementById('loginRoleName');
  if (roleInput) roleInput.value = role + '@piket';
  setTimeout(() => document.getElementById('loginPass').focus(), 100);
}

function backToRoles() {
  selectedLoginRole = null;
  document.getElementById('loginStep2').style.display = 'none';
  document.getElementById('loginStep1').style.display = 'block';
  document.getElementById('loginPass').value = '';
}

async function doLogin() {
  if (!selectedLoginRole) return showToast('Validasi', 'Pilih peran terlebih dahulu', 'error');
  if (!Object.prototype.hasOwnProperty.call(ROLES, selectedLoginRole))
    return showToast('Error', 'Peran tidak valid', 'error');

  const pass = document.getElementById('loginPass').value || 'demo'; // [WEB DEMO] password bebas
  if (pass.length > 128) return showToast('Validasi', 'Password terlalu panjang', 'error');

  // Rate limiting - cegah brute-force
  const rl = _RateLimit.check('login_' + selectedLoginRole);
  if (!rl.allowed) {
    return showToast('Terlalu banyak percobaan', `Coba lagi dalam ${rl.remaining} detik`, 'error');
  }

  _RateLimit.increment('login_' + selectedLoginRole);

  // Verifikasi ke serverless API (/api/login)
  let loginSuccess = false;
  let serverToken = null;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedLoginRole, password: pass })
    });

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    if (isJson) {
      const data = await res.json().catch(() => null);
      if (data && typeof data.ok === 'boolean') {
        if (res.ok && data.ok) {
          loginSuccess = true;
          serverToken = data.token;
        } else {
          return showToast('Error', data.error || 'Password salah', 'error');
        }
      } else {
        return showToast('Error', 'Format respons server tidak valid', 'error');
      }
    } else {
      return showToast('Error', 'Tidak bisa memverifikasi password saat offline', 'error');
    }
  } catch (err) {
    console.warn('[auth] Serverless login endpoint unreachable:', err);
    return showToast('Error', 'Tidak bisa memverifikasi password saat offline', 'error');
  }

  if (!loginSuccess) {
    return showToast('Error', 'Autentikasi gagal', 'error');
  }

  // Login sukses - reset rate limiter untuk role ini
  _RateLimit.reset('login_' + selectedLoginRole);

  currentRole = selectedLoginRole;
  // Simpan role dan server token ke sessionStorage (hilang saat tab ditutup)
  sessionStorage.setItem('piket_role', currentRole);
  if (serverToken) {
    sessionStorage.setItem('piket_token', serverToken);
  }

  document.getElementById('loginOverlay').style.opacity = '0';
  setTimeout(() => {
    document.getElementById('loginOverlay').style.display = 'none';
    showApp();
    setTimeout(() => {
      checkWhatsNew();
      if (currentRole === 'petugas') showWelcomePopup();
      else if (currentRole === 'guru') {
        // Guru mendarat di Dashboard (dengan grafik analitik), bukan langsung ke Panel Guru
        loadDashboardGuruCharts();
      } else if (currentRole === 'sekretaris') {
        // Langsung munculkan popup password admin, tanpa harus klik navbar dulu
        openAdminPage();
      }
      suggestDownloadApp();
    }, 500);
  }, 300);
}

/** Tampilkan banner instalasi PWA (bukan toast) 2 menit setelah login,
 *  kecuali jika sudah berjalan sebagai aplikasi terpasang (standalone). */
function suggestDownloadApp() {
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
    setTimeout(() => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
      if (sessionStorage.getItem('pwa_dismissed') === '1') return;
      if (typeof showInstallBanner === 'function') showInstallBanner();
    }, 120000); // 2 menit
  } catch (e) {}
}

function doLogout() {
  // Bersihkan semua data sesi
  sessionStorage.removeItem('piket_role');
  sessionStorage.removeItem('piket_token');
  sessionStorage.removeItem('piket_user'); // legacy key
  currentRole = null;
  adminUnlocked = false;
  // Stop polling sebelum reload
  if (typeof pollingInterval !== 'undefined' && pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  location.reload();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginOverlay').style.display !== 'none') doLogin();
  if (e.key === 'Enter' && document.getElementById('adminPwInput') === document.activeElement) verifyAdmin();
});

// ===== NAVIGATION =====
function navigateTo(page, btn) {
  // Auth guard - cegah akses halaman tanpa login
  if (!currentRole || !ROLES[currentRole]) {
    showToast('Akses Ditolak', 'Silakan login terlebih dahulu', 'error');
    return;
  }

  // Periksa apakah role boleh akses halaman ini
  const allowedPages = ROLES[currentRole].pages || [];
  if (!allowedPages.includes(page)) {
    showToast('Akses Ditolak', 'Anda tidak memiliki akses ke halaman ini', 'error');
    return;
  }

  if (page === 'input-pilih') { toggleInputSheet(); return; }
  closeInputSheet();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) return;
  pageEl.classList.add('active');
  if (btn) { btn.classList.add('active'); positionSidebarIndicator(btn, true); }
  if (page === 'dashboard' && currentRole === 'guru') {
    setTimeout(() => loadDashboardGuruCharts(), 100);
  }
  if (page === 'riwayat') { setDefaultDate(); loadRiwayat(); setDefaultRekapBulan(); loadRekapBulanan(); }
  if (page === 'admin') {
    setTimeout(() => { renderAdminForm(); lucide.createIcons(); }, 100);
  }
  if (page === 'panel-guru') {
    setTimeout(() => { initKelasSaya(); filterGuruData(); loadSiswaPerhatian(); }, 100);
  }
  if (page === 'input' && allData.length) renderRecent(allData.slice(0, 5));
  if (page === 'setting') applyProfileEverywhere();
  if (page === 'riwayat') requestAnimationFrame(() => positionSegIndicator(false));
  if (page === 'dashboard') loadKegiatanToday();
  if (page === 'pelanggaran') { initKegiatanForm(); renderKegiatanTypeGrid(); loadKegiatanRecent(); }
  lucide.createIcons();
}

// ===== TOMBOL PROFIL (dulu Setting) =====
// Semua ukuran layar: langsung masuk ke halaman Profil (tanpa popup Changelog).
// Changelog sekarang diakses dari baris "Tentang & Changelog" di halaman Profil.
function handleSettingNav(btn) {
  navigateTo('setting', btn);
}
function closeMobileSettingMenu() {}

// ===== SIDEBAR MOBILE =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ===== SLIDING INDICATOR NAV (mobile) =====
// Pill putih ngikutin jari pas ditarik, lalu snap+bounce ke tombol terdekat & pindah halaman
function sidebarActiveBtns() {
  return Array.from(document.querySelectorAll('#sidebar .sidebar-btn'))
    .filter(b => getComputedStyle(b).display !== 'none');
}
function positionSidebarIndicator(btn, animate) {
  const sidebar = document.getElementById('sidebar');
  const indicator = document.getElementById('sidebarIndicator');
  if (!sidebar || !indicator || !btn) return;
  if (window.innerWidth > 768) return;
  const sidebarRect = sidebar.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const iconEl = btn.querySelector('svg');
  const iconRect = iconEl ? iconEl.getBoundingClientRect() : btnRect;
  const sizeW = indicator.offsetWidth || 68;  // ukuran tetap (oval), dari CSS
  const sizeH = indicator.offsetHeight || 58;
  const centerX = btnRect.left + btnRect.width / 2 - sidebarRect.left;   // horizontal: tengah tombol
  const centerY = iconRect.top + iconRect.height / 2 - sidebarRect.top;  // vertikal: tengah ikon saja (biar simetris walau label beda)
  const margin = 6; // jarak aman dari tepi bar biar oval gak "mentok"/kepotong
  const maxLeft = Math.max(margin, sidebarRect.width - sizeW - margin);
  let left = centerX - sizeW / 2;
  left = Math.max(margin, Math.min(left, maxLeft));
  if (animate === false) indicator.style.transition = 'none';
  indicator.style.transform = `translate(${left}px, ${centerY - sizeH / 2}px)`;
  if (animate === false) {
    void indicator.offsetWidth; // force reflow biar transition none kepakai
    indicator.style.transition = '';
  }
}
function initSidebarIndicator() {
  const activeBtn = document.querySelector('#sidebar .sidebar-btn.active') || sidebarActiveBtns()[0];
  if (activeBtn) positionSidebarIndicator(activeBtn, false);
}
window.addEventListener('load', () => setTimeout(initSidebarIndicator, 50));
window.addEventListener('resize', () => {
  const activeBtn = document.querySelector('#sidebar .sidebar-btn.active');
  if (activeBtn) positionSidebarIndicator(activeBtn, false);
});

(function enableSidebarIndicatorDrag() {
  const sidebar = document.getElementById('sidebar');
  const indicator = document.getElementById('sidebarIndicator');
  if (!sidebar || !indicator) return;

  let dragging = false, moved = false, startX = 0, startLeft = 0, startTop = 0, curWidth = 0;

  function currentPos() {
    const m = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(indicator.style.transform || '');
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  }
  function onDown(clientX) {
    if (window.innerWidth > 768) return;
    dragging = true; moved = false;
    startX = clientX;
    const pos = currentPos();
    startLeft = pos.x; startTop = pos.y;
    curWidth = indicator.offsetWidth;
    sidebar.classList.add('dragging');
  }
  function onMove(clientX) {
    if (!dragging) return;
    const dx = clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    const maxLeft = Math.max(0, sidebar.scrollWidth - curWidth - 20); // 20 ~ padding kiri+kanan bar
    let left = startLeft + dx;
    left = Math.max(0, Math.min(left, maxLeft));
    indicator.style.transform = `translate(${left}px, ${startTop}px)`;
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    sidebar.classList.remove('dragging');
    if (!moved) return; // tap biasa - biarin klik tombol jalan normal

    const left = currentPos().x;
    const centerX = left + curWidth / 2;
    let nearest = null, minDist = Infinity;
    sidebarActiveBtns().forEach(b => {
      const c = b.offsetLeft + b.offsetWidth / 2;
      const d = Math.abs(c - centerX);
      if (d < minDist) { minDist = d; nearest = b; }
    });
    if (nearest) {
      positionSidebarIndicator(nearest, true); // snap + bounce
      moved = false; // reset dulu biar click programatik ini gak ke-block guard di bawah
      nearest.click(); // trigger navigasi halaman seperti tap biasa
    }
  }

  // Mouse (buat testing pakai kursor di preview/laptop)
  sidebar.addEventListener('mousedown', (e) => onDown(e.clientX));
  window.addEventListener('mousemove', (e) => onMove(e.clientX));
  window.addEventListener('mouseup', onUp);
  window.addEventListener('mouseleave', onUp);

  // Touch (HP asli)
  sidebar.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX), { passive: true });
  sidebar.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
  sidebar.addEventListener('touchend', onUp);
  sidebar.addEventListener('touchcancel', onUp);

  // Cegah klik ganda ke-trigger kalau abis narik beneran (bukan sekadar tap)
  sidebar.addEventListener('click', (e) => {
    if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
  }, true);
})();

// ===== CLOCK =====
// ===== TIME STATUS BANNER =====
const INPUT_START_HOUR = 5;   // 05:00 WIB
const INPUT_DEADLINE_HOUR = 9; // 09:00 WIB
let _bannerInterval = null;
let _lastBannerState = null;

function fmtCountdown(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function updateTimeBanner() {
  const banner = document.getElementById('timeLimitBanner');
  if (!banner) return;

  const now = new Date();
  const wibNow = new Date(now.getTime() + 7 * 3600 * 1000);
  const wibH   = wibNow.getUTCHours();
  const wibM   = wibNow.getUTCMinutes();
  const wibS   = wibNow.getUTCSeconds();
  const totalSecs = wibH * 3600 + wibM * 60 + wibS;
  const startSec    = INPUT_START_HOUR * 3600;    // 18000
  const deadlineSec = INPUT_DEADLINE_HOUR * 3600; // 32400

  // Hanya re-render struktur kalau state berubah (hindari flicker)
  let state;
  if (totalSecs < startSec) state = 'before';
  else if (totalSecs < deadlineSec) state = 'open';
  else state = 'closed';

  banner.style.display = 'flex';

  if (state !== _lastBannerState) {
    // Ganti style dan struktur
    _lastBannerState = state;
    if (state === 'before') {
      banner.style.cssText += ';background:rgba(232,164,74,0.09);border-color:rgba(232,164,74,0.25);color:var(--amber)';
      banner.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Input <strong>belum dibuka</strong> &nbsp;·&nbsp; Buka pukul 05:00 &nbsp;·&nbsp; Menghitung mundur: <strong id="bannerCountdown">--:--:--</strong></span>`;
    } else if (state === 'open') {
      banner.style.cssText += ';background:rgba(94,184,138,0.08);border-color:rgba(94,184,138,0.25);color:var(--green-soft)';
      banner.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Input <strong>terbuka</strong> &nbsp;·&nbsp; Tutup pukul 09:00 &nbsp;·&nbsp; Sisa: <strong id="bannerCountdown">--:--:--</strong></span>`;
    } else {
      banner.style.cssText += ';background:rgba(224,96,96,0.09);border-color:rgba(224,96,96,0.3);color:var(--red)';
      banner.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Input <strong>ditutup</strong> &nbsp;·&nbsp; Hanya bisa pukul 05:00-09:00 pagi &nbsp;·&nbsp; Buka lagi: <strong id="bannerCountdown">--:--:--</strong></span>`;
    }
  }

  // Update angka countdown tiap detik tanpa re-render HTML
  const cdEl = document.getElementById('bannerCountdown');
  if (cdEl) {
    if (state === 'before') {
      cdEl.textContent = fmtCountdown(startSec - totalSecs);
    } else if (state === 'open') {
      cdEl.textContent = fmtCountdown(deadlineSec - totalSecs);
    } else {
      // Hitung mundur ke jam 5 pagi berikutnya
      const secsInDay = 24 * 3600;
      const nextStart = startSec + secsInDay; // jam 5 besok (dalam detik dari midnight WIB)
      const remaining = nextStart - totalSecs;
      cdEl.textContent = fmtCountdown(remaining);
    }
  }
}

// PERF FIX #1 (lanjutan) - banner countdown & jam sekarang numpang
// di master ticker (satu setInterval bersama), bukan bikin
// setInterval sendiri2. _bannerInterval tetap disimpan (unused)
// hanya biar tidak break kode lain yang mungkin mereferensikannya.
let _pkClockRegistered = false;
let _pkBannerRegistered = false;

function startTimeBannerTick() {
  updateTimeBanner();
  if (!_pkBannerRegistered) {
    _pkBannerRegistered = true;
    _pkRegisterTick(updateTimeBanner);
  }
}

function startClock() {
  function tick() {
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7*60*60*1000);
    const time = wibNow.toISOString().substring(11,19);
    const date = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Jakarta' });
    // navClock removed from navbar - now in dashClockBar
    const dc = document.getElementById('dashClockText');
    const dd = document.getElementById('dashDateText');
    if (dc) dc.textContent = time;
    if (dd) dd.textContent = date;
    const mc = document.getElementById('mobileClockText');
    const md = document.getElementById('mobileDateText');
    if (mc) mc.textContent = time;
    if (md) md.textContent = date;
  }
  tick();
  if (!_pkClockRegistered) {
    _pkClockRegistered = true;
    _pkRegisterTick(tick);
  }
}

// ===== TOAST =====
// Notifikasi tampil di atas layar (tengah). Masuk turun dari atas sambil menciut
// dari kecil ke besar; kalau ada lebih dari satu, notifikasi bertumpuk (yang
// terbaru paling depan, yang lama menyembul di belakang). Saat hilang, animasinya dibalik: naik ke atas
// sambil menciut dari besar ke kecil.
const _PK_TOAST_MAX = 4;
let _pkToastObs = null;

function _pkDismissToast(t) {
  if (!t || t.classList.contains('hiding')) return;
  t.classList.add('hiding');
  setTimeout(() => t.remove(), 340);
}

function _pkToastLayout() {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  // Urutan: index 0 = paling baru
  const live = Array.from(container.querySelectorAll('.toast:not(.hiding)')).reverse();
  // Batasi jumlah toast yang tampil bersamaan; sisanya (paling lama) ditutup
  live.slice(_PK_TOAST_MAX).forEach(_pkDismissToast);
  // Atur kedalaman tumpukan: 0 = paling depan, makin besar makin ke belakang
  live.slice(0, _PK_TOAST_MAX).forEach((t, i) => {
    t.style.setProperty('--pk-i', i);
    t.style.zIndex = String(_PK_TOAST_MAX - i);
  });
  // Buang catatan mutasi yang dibuat oleh layout sendiri supaya tidak berulang
  if (_pkToastObs) _pkToastObs.takeRecords();
}

function _pkInitToastStack() {
  if (_pkToastObs) return;
  const c = document.getElementById('toastContainer');
  if (!c) return;
  // Observer juga menata toast yang dibuat kode lain (mis. toast unduhan)
  _pkToastObs = new MutationObserver(_pkToastLayout);
  _pkToastObs.observe(c, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

function showToast(title, msg, type = 'info') {
  const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
  const container = document.getElementById('toastContainer');
  if (!container) return;
  _pkInitToastStack();
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.setAttribute('role', type === 'error' ? 'alert' : 'status');
  t.innerHTML = `
    <div class="toast-icon"><i data-lucide="${icons[type]}" style="width:18px;height:18px"></i></div>
    <div class="toast-msg"><div class="toast-title">${title}</div><div class="toast-sub">${msg}</div></div>`;
  container.appendChild(t);
  _pkToastLayout();
  lucide.createIcons();
  t.addEventListener('click', () => _pkDismissToast(t));
  setTimeout(() => _pkDismissToast(t), 3500);
}


// ===== ABSENSI PIKET =====
let absensiData = {}; // { nama: 'hadir'|'absen'|'pending' }

async function loadAbsensi() {
  const today = getWIBDate();
  if (!demoMode) {
    try {
      const data = await supaFetch('absensi_piket?tanggal=eq.' + today + '&select=*', { skipPathCheck: true });
      absensiData = {};
      (data||[]).forEach(r => { absensiData[r.nama] = r.status; });
    } catch(e) { console.warn('absensi load error:', e.message); }
  }
  renderAbsensi();
}

function renderAbsensi() {
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date().getDay()];
  const jadwal = cachedJadwal[hari];
  const grid = document.getElementById('absensiGrid');
  const status = document.getElementById('absensiStatus');
  if (!grid) return;

  if (!jadwal) {
    grid.innerHTML = '<div class="absensi-empty">Tidak ada jadwal piket hari ini</div>';
    if (status) status.textContent = '';
    return;
  }

  const allPeople = [
    { nama: jadwal.pj, peran: 'Penanggung Jawab' },
    ...(jadwal.kegiatan||[]).map(n => ({ nama: n, peran: 'Piket Kegiatan' })),
    ...(jadwal.gerbang||[]).map(n => ({ nama: n, peran: 'Piket Gerbang' }))
  ].filter(p => p.nama);

  if (!allPeople.length) {
    grid.innerHTML = '<div class="absensi-empty">Belum ada data petugas untuk hari ini</div>';
    return;
  }

  const hadirCount = allPeople.filter(p => absensiData[p.nama] === 'hadir').length;
  if (status) status.textContent = hadirCount + '/' + allPeople.length + ' hadir';

  grid.innerHTML = allPeople.map(p => {
    const st = absensiData[p.nama] || 'pending';
    const label = st === 'hadir' ? 'Hadir' : st === 'absen' ? 'Tidak Hadir' : 'Tandai';
    return `<div class="absensi-person">
      <div>
        <div class="absensi-name">${escHtml(p.nama)}</div>
        <span class="absensi-role">${escHtml(p.peran)}</span>
      </div>
      <button class="absensi-toggle ${st}" data-absensi-nama="${escHtml(p.nama)}" data-absensi-status="${escHtml(st)}">${label}</button>
    </div>`;
  }).join('');
}

async function toggleAbsensi(nama, current) {
  // Auth guard - petugas boleh ubah absensi
  if (!currentRole || !['petugas', 'sekretaris'].includes(currentRole)) {
    showToast('Akses Ditolak', 'Anda tidak memiliki izin mengubah absensi', 'error');
    return;
  }

  // Validasi input
  const safaNama = sanitizeInput(nama);
  if (!safaNama || safaNama.length > 100) return;
  const newStatus = current === 'hadir' ? 'absen' : 'hadir';
  const today = getWIBDate();
  absensiData[safaNama] = newStatus;
  renderAbsensi();

  if (!demoMode) {
    try {
      const writeRes = await apiWrite({
        table: 'absensi_piket',
        action: 'upsert',
        data: {
          nama: safaNama,
          status: newStatus
        }
      });
      if (writeRes?.offline) {
        showToast('Tersimpan Offline', `Absensi ${escHtml(safaNama)} tersimpan di perangkat`, 'info');
      }
    } catch(e) {
      console.warn('[toggleAbsensi] error:', e.message);
      showToast('Error', e.message || 'Gagal menyimpan absensi', 'error');
    }
  }
}

// ===== GURU: PANEL MONITOR DATA =====
let guruFiltered = [];

// ===== KELAS SAYA (guru) =====
function initKelasSaya() {
  const sel = document.getElementById('guruKelasSayaSelect');
  const chk = document.getElementById('guruKelasSayaToggle');
  if (!sel || !chk) return;
  sel.value = localStorage.getItem('guruKelasSaya') || '';
  chk.checked = localStorage.getItem('guruKelasSayaAktif') === '1';
  if (chk.checked && sel.value) {
    const kf = document.getElementById('guruFilterKelas');
    if (kf) kf.value = sel.value;
  }
}

function saveKelasSaya() {
  const sel = document.getElementById('guruKelasSayaSelect');
  const chk = document.getElementById('guruKelasSayaToggle');
  if (!sel || !chk) return;
  localStorage.setItem('guruKelasSaya', sel.value);
  localStorage.setItem('guruKelasSayaAktif', chk.checked ? '1' : '0');
  const kf = document.getElementById('guruFilterKelas');
  if (kf) {
    kf.value = (chk.checked && sel.value) ? sel.value : '';
  }
  filterGuruData();
  showToast('Tersimpan', chk.checked && sel.value ? `Kelas Saya: ${sel.value}` : 'Preferensi kelas diperbarui', 'success');
}

// PERF FIX - tabel Panel Guru dulunya render SEMUA baris terfilter
// sekaligus tanpa batas (bisa ratusan baris kalau rentang tanggal
// lebar). Sekarang pakai pagination yang sama seperti tabel utama
// (PER_PAGE=15) supaya DOM selalu terbatas & scroll tetap ringan
// walau datanya banyak.
let currentGuruPage = 1;

function filterGuruData() {
  const search = (document.getElementById('guruSearch')?.value || '').toLowerCase();
  const kelas  = document.getElementById('guruFilterKelas')?.value || '';
  const jenis  = document.getElementById('guruFilterJenis')?.value || '';
  guruFiltered = allData.filter(d =>
    (d.nama || '').toLowerCase().includes(search) &&
    (!kelas || d.kelas === kelas) &&
    (!jenis || d.pelanggaran === jenis)
  );
  currentGuruPage = 1;
  renderGuruTable();
  renderSiswaPerhatian(); // hanya render ulang pakai pool 30-hari yang sudah ada, tidak fetch ulang
}

// ===== DASHBOARD GRAFIK GURU =====
let guruChartInstances = {};

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

async function loadDashboardGuruCharts() {
  if (typeof Chart === 'undefined') { setTimeout(loadDashboardGuruCharts, 300); return; }

  const HARI = 30;
  const startDt = new Date(Date.now() - HARI * 24 * 60 * 60 * 1000);
  const startDate = new Date(startDt.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = getWIBDate();

  let rows = [];
  if (demoMode) {
    rows = allData.filter(r => r.waktu_input && r.waktu_input.slice(0,10) >= startDate);
  } else {
    try {
      const { start } = getWIBDateRange(startDate);
      const { end } = getWIBDateRange(endDate);
      const { data, error } = await window._supa
        .from('piket_resimen').select('*')
        .gte('waktu_input', start)
        .lte('waktu_input', end);
      if (error) { console.warn('[loadDashboardGuruCharts] DB error:', error.message); return; }
      rows = data || [];
    } catch (e) {
      console.warn('[loadDashboardGuruCharts] gagal:', e);
      return;
    }
  }

  renderGuruChartTrend(rows);
  renderGuruChartKelas(rows);
  renderGuruChartJenis(rows);
  renderGuruChartKegiatan();
}

function renderGuruChartTrend(rows) {
  const canvas = document.getElementById('guruChartTrend');
  if (!canvas) return;

  // 14 hari terakhir, urut dari yg terlama ke terbaru
  const HARI = 14;
  const labels = [];
  const dayKeys = [];
  for (let i = HARI - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
    dayKeys.push(key);
    labels.push(new Date(key).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
  }
  const telatData = dayKeys.map(k => rows.filter(r => r.waktu_input?.slice(0,10) === k && (r.pelanggaran === 'T' || r.pelanggaran === 'T+AT')).length);
  const atributData = dayKeys.map(k => rows.filter(r => r.waktu_input?.slice(0,10) === k && (r.pelanggaran === 'AT' || r.pelanggaran === 'T+AT')).length);

  const totalKejadian = telatData.reduce((a,b)=>a+b,0) + atributData.reduce((a,b)=>a+b,0);
  const subEl = document.getElementById('guruChartTrendSub');
  if (subEl) subEl.textContent = `${totalKejadian} kejadian tercatat dalam 14 hari terakhir`;

  const orange = '#fb923c';
  const purple = '#a78bfa';
  const gridColor = 'rgba(128,128,128,0.15)';
  const textColor = cssVar('--white-dim', '#9CA3AF');

  if (guruChartInstances.trend) guruChartInstances.trend.destroy();
  guruChartInstances.trend = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Terlambat', data: telatData, borderColor: orange, backgroundColor: orange + '22', fill: true, tension: 0.35, pointRadius: 3 },
        { label: 'Atribut Tidak Lengkap', data: atributData, borderColor: purple, backgroundColor: purple + '22', fill: true, tension: 0.35, pointRadius: 3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', labels: { color: textColor, boxWidth: 10, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
        y: { beginAtZero: true, ticks: { color: textColor, precision: 0, font: { size: 10 } }, grid: { color: gridColor } }
      }
    }
  });
}

function renderGuruChartKelas(rows) {
  const canvas = document.getElementById('guruChartKelas');
  if (!canvas) return;

  const map = {};
  rows.forEach(r => { map[r.kelas] = (map[r.kelas] || 0) + 1; });
  const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 12);

  const subEl = document.getElementById('guruChartKelasSub');
  if (subEl) subEl.textContent = sorted.length ? `Kelas tertinggi: ${sorted[0][0]} (${sorted[0][1]} kejadian)` : 'Belum ada data';

  const cyan = cssVar('--cyan', '#06D6E0');
  const textColor = cssVar('--white-dim', '#9CA3AF');
  const gridColor = 'rgba(128,128,128,0.15)';

  if (guruChartInstances.kelas) guruChartInstances.kelas.destroy();
  guruChartInstances.kelas = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{ label: 'Total Kejadian', data: sorted.map(s => s[1]), backgroundColor: cyan + 'cc', borderRadius: 6, maxBarThickness: 26 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { color: textColor, precision: 0, font: { size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { size: 10.5 } }, grid: { display: false } }
      }
    }
  });
}

function renderGuruChartJenis(rows) {
  const canvas = document.getElementById('guruChartJenis');
  if (!canvas) return;

  const telat = rows.filter(r => r.pelanggaran === 'T').length;
  const atribut = rows.filter(r => r.pelanggaran === 'AT').length;
  const keduanya = rows.filter(r => r.pelanggaran === 'T+AT').length;

  const orange = '#fb923c', purple = '#a78bfa', cyan = cssVar('--cyan', '#06D6E0');
  const textColor = cssVar('--white-dim', '#9CA3AF');

  if (guruChartInstances.jenis) guruChartInstances.jenis.destroy();
  guruChartInstances.jenis = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Telat', 'Atribut', 'Telat + Atribut'],
      datasets: [{ data: [telat, atribut, keduanya], backgroundColor: [orange, purple, cyan], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { color: textColor, boxWidth: 10, font: { size: 11 } } } }
    }
  });
}


let siswaPerhatianRaw = []; // pool data 30 hari terakhir, di-fetch terpisah dari allData (yg cuma data hari ini)

async function loadSiswaPerhatian() {
  const HARI = 30;
  const end = getWIBDate();
  const startDt = new Date(Date.now() - HARI * 24 * 60 * 60 * 1000);
  const start = new Date(startDt.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (demoMode) {
    siswaPerhatianRaw = allData.filter(r => r.waktu_input && r.waktu_input.slice(0,10) >= start);
    renderSiswaPerhatian();
    return;
  }

  try {
    const { start: startISO } = getWIBDateRange(start);
    const { end: endISO } = getWIBDateRange(end);
    const { data, error } = await window._supa
      .from('piket_resimen').select('*')
      .gte('waktu_input', startISO)
      .lte('waktu_input', endISO);
    if (error) {
      console.warn('[loadSiswaPerhatian] DB error:', error.message);
      return;
    }
    siswaPerhatianRaw = data || [];
    renderSiswaPerhatian();
  } catch (e) {
    console.warn('[loadSiswaPerhatian] gagal:', e);
  }
}

function computeSiswaPerhatian(rows, minKejadian = 4) {
  const grouped = {};
  rows.forEach(d => {
    // key dinormalisasi (lowercase + trim) biar tidak kebelah gara-gara beda kapital/spasi
    const key = (d.nama || '').toLowerCase().trim() + '||' + (d.kelas || '').toLowerCase().trim();
    if (!grouped[key]) grouped[key] = { nama: d.nama, kelas: d.kelas, telat: 0, atribut: 0, total: 0 };
    if (d.pelanggaran === 'T' || d.pelanggaran === 'T+AT') grouped[key].telat++;
    if (d.pelanggaran === 'AT' || d.pelanggaran === 'T+AT') grouped[key].atribut++;
    grouped[key].total++;
  });
  return Object.values(grouped)
    .filter(s => s.total >= minKejadian)
    .sort((a, b) => b.total - a.total);
}

function renderSiswaPerhatian() {
  const container = document.getElementById('guruPerhatianList');
  if (!container) return;
  // Selalu tampilkan semua kelas - tidak ikut filter "Kelas Saya" / dropdown kelas
  const list = computeSiswaPerhatian(siswaPerhatianRaw);
  if (!list.length) {
    container.innerHTML = `<div class="empty-state" style="padding:20px 0">
      <div class="empty-icon"><i data-lucide="check-circle-2" style="width:24px;height:24px;color:var(--cyan)"></i></div>
      <div class="empty-title">Tidak ada siswa dengan pelanggaran berulang</div>
    </div>`;
    lucide.createIcons();
    return;
  }
  container.innerHTML = list.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.18);margin-bottom:6px;cursor:pointer" data-riwayat-nama="${escHtml(s.nama)}" data-riwayat-kelas="${escHtml(s.kelas)}">
      <div style="min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(s.nama)}</div>
        <div style="font-size:11px;color:var(--white-dim)">${escHtml(s.kelas)} - ${s.telat} Telat, ${s.atribut} Atribut</div>
      </div>
      <div style="flex-shrink:0;font-size:12px;font-weight:700;color:#f87171;background:rgba(248,113,113,0.12);border-radius:20px;padding:4px 10px">${s.total}x</div>
    </div>`).join('');
  lucide.createIcons();
}

// ===== RIWAYAT SISWA (modal, dari Panel Guru) =====
function showRiwayatSiswa(nama, kelas) {
  const riwayat = siswaPerhatianRaw
    .filter(d => (d.nama||'').toLowerCase().trim() === nama.toLowerCase().trim() && d.kelas === kelas)
    .sort((a, b) => new Date(b.waktu_input) - new Date(a.waktu_input));

  document.getElementById('riwayatSiswaNama').textContent = nama;
  document.getElementById('riwayatSiswaSub').textContent = `${kelas} - ${riwayat.length} kejadian tercatat`;

  const list = document.getElementById('riwayatSiswaList');
  list.innerHTML = riwayat.map(d => `
    <div style="padding:9px 12px;border-radius:9px;background:var(--surface-raised,rgba(255,255,255,0.03));border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span class="badge ${d.pelanggaran==='T'?'telat':d.pelanggaran==='AT'?'atribut':'both'}">${escHtml(d.pelanggaran)}</span>
        <span style="font-size:11px;color:var(--white-dim)">${formatDateID(d.waktu_input?.split('T')[0])} · ${formatTime(d.waktu_input)}</span>
      </div>
      ${d.detail ? `<div style="font-size:12px;color:var(--white-dim);margin-top:6px">${escHtml(d.detail)}</div>` : ''}
    </div>`).join('') || `<div class="empty-state" style="padding:20px 0">
      <div class="empty-title">Belum ada riwayat</div>
    </div>`;

  document.getElementById('riwayatSiswaModal').classList.add('open');
}

function renderGuruTable() {
  const body  = document.getElementById('guruTableBody');
  const count = document.getElementById('guruTableCount');
  if (!body) return;
  if (count) count.textContent = guruFiltered.length + ' data ditemukan';
  if (!guruFiltered.length) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="empty-icon"><i data-lucide="inbox" style="width:28px;height:28px;color:var(--cyan)"></i></div>
      <div class="empty-title">Tidak ada data</div></div></td></tr>`;
    const pg0 = document.getElementById('guruPagination');
    if (pg0) pg0.style.display = 'none';
    lucide.createIcons(); return;
  }

  // PERF FIX - render per halaman (PER_PAGE), bukan semua baris sekaligus
  const total = Math.ceil(guruFiltered.length / PER_PAGE);
  const start = (currentGuruPage - 1) * PER_PAGE;
  const slice = guruFiltered.slice(start, start + PER_PAGE);

  body.innerHTML = slice.map((d, i) => `<tr>
    <td class="col-no" style="color:var(--white-dim);font-size:12px">${start + i + 1}</td>
    <td style="font-weight:600">${escHtml(d.nama)}</td>
    <td style="color:var(--white-dim)">${escHtml(d.kelas)}</td>
    <td><span class="badge ${d.pelanggaran==='T'?'telat':d.pelanggaran==='AT'?'atribut':'both'}">${escHtml(d.pelanggaran)}</span></td>
    <td class="col-detail">${escHtml(d.detail||'-')}</td>
    <td class="col-time">${formatTime(d.waktu_input)}</td>
    <td>${currentRole !== 'petugas' ? `<button class="btn-delete" data-del-id="${escHtml(String(d.id))}" data-del-nama="${escHtml(d.nama || '')}">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
    </button>` : ''}</td>
  </tr>`).join('');

  // Pagination
  const pg = document.getElementById('guruPagination');
  if (pg) pg.style.display = guruFiltered.length > PER_PAGE ? 'flex' : 'none';
  const pgInfo = document.getElementById('guruPageInfo');
  if (pgInfo) pgInfo.textContent = `Halaman ${currentGuruPage} dari ${total} · ${guruFiltered.length} data`;

  const btns = document.getElementById('guruPageBtns');
  if (btns) {
    btns.innerHTML = '';
    const prev = Object.assign(document.createElement('button'), { className: 'page-btn', innerHTML: '<i data-lucide="chevron-left" style="width:14px;height:14px"></i>' });
    prev.disabled = currentGuruPage === 1;
    prev.onclick = () => { currentGuruPage--; renderGuruTable(); };
    btns.appendChild(prev);

    for (let p = 1; p <= total; p++) {
      if (total > 7 && p > 2 && p < total - 1 && Math.abs(p - currentGuruPage) > 1) {
        if (btns.lastChild?.textContent !== '...') {
          const dots = document.createElement('button');
          dots.className = 'page-btn'; dots.textContent = '...'; dots.disabled = true;
          btns.appendChild(dots);
        }
        continue;
      }
      const b = document.createElement('button');
      b.className = 'page-btn' + (p === currentGuruPage ? ' active' : '');
      b.textContent = p;
      b.onclick = () => { currentGuruPage = p; renderGuruTable(); };
      btns.appendChild(b);
    }

    const next = Object.assign(document.createElement('button'), { className: 'page-btn', innerHTML: '<i data-lucide="chevron-right" style="width:14px;height:14px"></i>' });
    next.disabled = currentGuruPage === total;
    next.onclick = () => { currentGuruPage++; renderGuruTable(); };
    btns.appendChild(next);
  }

  lucide.createIcons();
}

async function exportGuruExcel() {
  await ensureXLSX();
  if (!guruFiltered.length) return showToast('Info','Tidak ada data untuk diekspor','info');
  const ws = buildExcelSheet(guruFiltered, new Date());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Panel Guru');
  const fileName = 'PanelGuru_'+new Date().toISOString().split('T')[0]+'.xlsx';
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, fileName, 'Excel Panel Guru');
}

async function exportGuruPDF() {
  await ensurePDF();
  if (!guruFiltered.length) return showToast('Info','Tidak ada data untuk diekspor','info');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  doc.setFontSize(16); doc.setFont('helvetica','bold');
  doc.text('DAFTAR PELANGGARAN SISWA', 14, 18);
  doc.setFontSize(11); doc.setFont('helvetica','normal');
  doc.text('SMKN 6 Tangerang Selatan', 14, 25);
  doc.text('Tanggal: '+date, 14, 31);
  doc.line(14,34,196,34);
  doc.autoTable({
    startY:38,
    head:[['#','Nama','Kelas','Ket.','Keterangan Pelanggaran','Waktu']],
    body:guruFiltered.map((d,i)=>[i+1,d.nama,d.kelas,d.pelanggaran,d.detail||'-',formatTime(d.waktu_input)]),
    headStyles:{fillColor:[5,150,105],textColor:255,fontStyle:'bold',fontSize:9},
    bodyStyles:{fontSize:8},
    alternateRowStyles:{fillColor:[245,245,255]},
    margin:{left:14,right:14}
  });
  const fileName = 'PanelGuru_'+new Date().toISOString().split('T')[0]+'.pdf';
  const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
  downloadFile(blob, fileName, 'PDF Panel Guru');
}



// ===== PASSWORD HASHING (SHA-256 via Web Crypto API) =====
async function hashPw(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ===== INPUT SECURITY & SANITIZATION =====

/** Strip semua karakter berbahaya dari input teks */
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    // Karakter berbahaya HTML/JS
    .replace(/[<>"'`\\]/g, '')
    // SQL comment markers
    .replace(/--+/g, '')
    .replace(/\/\*/g, '').replace(/\*\//g, '')
    .replace(/;/g, '')
    // SQL keywords berbahaya (defense in depth - SDK sudah parameterized)
    .replace(/(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|EXECUTE|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|CAST|CONVERT|DECLARE|FETCH|OPEN|CURSOR)/gi, '')
    // JavaScript injection
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 500);
}

/** Validasi ID harus angka positif */
function validateId(id) {
  if (typeof id === "string" && id.startsWith("_offline_")) return id;
  const n = parseInt(id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Kelas yang diizinkan */
const ALLOWED_KELAS = [
  'X RPL 1','X RPL 2','X TKJ 1','X TKJ 2','X BC 1','X BC 2',
  'XI RPL 1','XI RPL 2','XI TKJ 1','XI TKJ 2','XI BC 1','XI BC 2',
  'XII RPL 1','XII RPL 2','XII TKJ 1','XII TKJ 2','XII BC 1','XII BC 2'
];

/** Samakan format kelas: trim, spasi ganda/nbsp jadi satu spasi, huruf besar */
function normalizeKelas(v) {
  return String(v || '').replace(/[\s\u00A0]+/g, ' ').trim().toUpperCase();
}

/** Jenis pelanggaran yang diizinkan */
const ALLOWED_PELANGGARAN = ['T', 'AT', 'T+AT'];


function triggerInstall() {
  // Sudah berjalan sebagai aplikasi terpasang (standalone)?
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    if (typeof showToast === 'function') showToast('Sudah Terpasang', 'PiketKu sudah berjalan sebagai aplikasi di perangkat ini', 'info');
    return;
  }

  // Gunakan prompt instalasi asli browser jika sudah tersedia
  if (window._deferredPrompt) {
    window._deferredPrompt.prompt();
    window._deferredPrompt.userChoice.then(r => {
      window._deferredPrompt = null;
      if (r.outcome === 'accepted' && typeof showToast === 'function') {
        showToast('Mengunduh...', 'PiketKu sedang dipasang', 'success');
      }
    });
    return;
  }

  // Prompt belum tersedia (mis. iOS Safari, atau kriteria instalasi browser belum terpenuhi)
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    if (typeof showToast === 'function') {
      showToast('Pasang di iOS', 'Ketuk ikon Bagikan di Safari lalu pilih "Tambah ke Layar Utama"', 'info');
    }
  } else if (typeof showInstallBanner === 'function') {
    showInstallBanner();
    if (typeof showToast === 'function') {
      showToast('Belum Siap', 'Muat ulang halaman, lalu tekan tombol Unduh lagi', 'info');
    }
  }
}

// ===== HELPERS =====
function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
function formatDateID(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }


// ===== EXPOSE TO GLOBAL SCOPE (called from HTML) =====
window.cancelEdit = typeof cancelEdit !== "undefined" ? cancelEdit : function(){};
window.selectRole = typeof selectRole !== "undefined" ? selectRole : function(){};
window.backToRoles = typeof backToRoles !== "undefined" ? backToRoles : function(){};
window.doLogin = typeof doLogin !== "undefined" ? doLogin : function(){};
window.suggestDownloadApp = typeof suggestDownloadApp !== "undefined" ? suggestDownloadApp : function(){};
window.doLogout = typeof doLogout !== "undefined" ? doLogout : function(){};
// ============================================================
// UPDATE 2.0 - PELANGGARAN KEGIATAN
// Input 24 jam (tanpa jendela 05:00-09:00), boleh pilih beberapa pelanggaran.
// Write lewat /api/write (tabel pelanggaran_kegiatan), read langsung via Supabase SDK.
// ============================================================
const KG_TYPES = [
  { key: 'tidak_lengkap',        label: 'Tidak lengkap',            icon: 'users' },
  { key: 'telat_turun',          label: 'Telat turun saat kegiatan', icon: 'clock' },
  { key: 'makeup',               label: 'Memakai makeup',           icon: 'sparkles' },
  { key: 'tanpa_ciput',          label: 'Tidak memakai ciput',      icon: 'circle-slash' },
  { key: 'tanpa_legging',        label: 'Tidak memakai legging',    icon: 'ban' },
  { key: 'rambut_panjang',       label: 'Rambut panjang',           icon: 'scissors' },
  { key: 'atribut_tidak_sesuai', label: 'Atribut tidak sesuai',     icon: 'shirt' }
];
const KG_KEYS = KG_TYPES.map(t => t.key);
const KG_LABEL = Object.fromEntries(KG_TYPES.map(t => [t.key, t.label]));
let kgSelected = new Set();
let kgRekapData = [];
let deleteKegiatanId = null;
let kgAcResults = [];
let kgAcActive = -1;
let kgInitDone = false;

function inputSidebarBtnEl() { return document.getElementById('inputSidebarBtn'); }
// Popup pilih jenis input (bottom sheet di mobile, modal di desktop)
function isInputSheetOpen() { return document.getElementById('inputSheet')?.classList.contains('open'); }
function openInputSheet() {
  if (!currentRole || !ROLES[currentRole] || !ROLES[currentRole].pages.includes('input-pilih')) return;
  const sheet = document.getElementById('inputSheet');
  if (!sheet) return;
  document.getElementById('inputSheetOverlay').classList.add('open');
  sheet.classList.add('open');
  sheet.setAttribute('aria-hidden', 'false');
  document.getElementById('navFab')?.classList.add('active');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
function closeInputSheet() {
  document.getElementById('inputSheetOverlay')?.classList.remove('open');
  const sheet = document.getElementById('inputSheet');
  if (sheet) { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); }
  document.getElementById('navFab')?.classList.remove('active');
}
function toggleInputSheet() { if (isInputSheetOpen()) closeInputSheet(); else openInputSheet(); }
function openInputChooser() { openInputSheet(); }
function openInputGerbang() { closeInputSheet(); navigateTo('input', inputSidebarBtnEl()); }
function openInputKegiatan() { closeInputSheet(); navigateTo('pelanggaran', inputSidebarBtnEl()); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isInputSheetOpen()) closeInputSheet(); });

function renderKegiatanTypeGrid() {
  const grid = document.getElementById('kgTypeGrid');
  if (!grid) return;
  grid.innerHTML = KG_TYPES.map(t => `
    <button type="button" class="violation-btn kg-chip${kgSelected.has(t.key) ? ' selected kg' : ''}" data-kg-type="${t.key}">
      <i data-lucide="${t.icon}" style="width:16px;height:16px"></i> ${escHtml(t.label)}
    </button>`).join('');
  lucide.createIcons();
}

function initKegiatanForm() {
  if (kgInitDone) return;
  kgInitDone = true;

  document.getElementById('kgTypeGrid')?.addEventListener('click', e => {
    const b = e.target.closest('[data-kg-type]');
    if (!b) return;
    const k = b.dataset.kgType;
    if (!KG_KEYS.includes(k)) return;
    if (kgSelected.has(k)) kgSelected.delete(k); else kgSelected.add(k);
    b.classList.toggle('selected', kgSelected.has(k));
    b.classList.toggle('kg', kgSelected.has(k));
  });

  // Autocomplete nama (roster STUDENTS sama seperti form piket gerbang)
  const inp = document.getElementById('kgNama');
  const drop = document.getElementById('kgNamaDropdown');
  const pick = idx => {
    const s = kgAcResults[idx];
    if (!s) return;
    inp.value = s.nama;
    document.getElementById('kgKelas').value = s.kelas;
    drop.classList.remove('open');
  };
  const show = () => {
    kgAcActive = -1;
    const q = inp.value.trim().toLowerCase();
    if (q.length < 2) { drop.classList.remove('open'); return; }
    kgAcResults = STUDENTS.filter(s => s.nama.toLowerCase().includes(q)).slice(0, 20);
    if (!kgAcResults.length) {
      drop.innerHTML = '<div class="autocomplete-empty">Siswa tidak ditemukan</div>';
    } else {
      drop.innerHTML = kgAcResults.map((s, i) => `<div class="autocomplete-item" data-idx="${i}">
        <span class="autocomplete-name">${escHtml(s.nama)}</span>
        <span class="autocomplete-kelas">${escHtml(s.kelas)}</span></div>`).join('');
    }
    drop.classList.add('open');
  };
  inp?.addEventListener('input', show);
  inp?.addEventListener('focus', show);
  inp?.addEventListener('keydown', e => {
    const items = drop.querySelectorAll('.autocomplete-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); kgAcActive = Math.min(kgAcActive + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); kgAcActive = Math.max(kgAcActive - 1, 0); }
    else if (e.key === 'Enter' && kgAcActive >= 0) { e.preventDefault(); pick(kgAcActive); return; }
    else if (e.key === 'Escape') { drop.classList.remove('open'); return; }
    else return;
    items.forEach((el, i) => el.classList.toggle('active', i === kgAcActive));
    items[kgAcActive]?.scrollIntoView({ block: 'nearest' });
  });
  drop?.addEventListener('mousedown', e => {
    const it = e.target.closest('.autocomplete-item');
    if (it) pick(parseInt(it.dataset.idx, 10));
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.autocomplete-wrap')) drop?.classList.remove('open');
  });

}

function kgBadges(arr) {
  const list = Array.isArray(arr) ? arr : [];
  return list.filter(k => KG_KEYS.includes(k))
    .map(k => `<span class="badge kg-badge">${escHtml(KG_LABEL[k])}</span>`).join(' ') || '-';
}

function resetKegiatanForm() {
  document.getElementById('kgNama').value = '';
  document.getElementById('kgKelas').value = '';
  document.getElementById('kgDetail').value = '';
  kgSelected = new Set();
  renderKegiatanTypeGrid();
}

async function submitKegiatan() {
  if (!currentRole || !['petugas', 'sekretaris'].includes(currentRole)) {
    showToast('Akses Ditolak', 'Anda tidak memiliki izin untuk input data', 'error');
    return;
  }
  if (demoMode && !sessionStorage.getItem('piket_token')) {
    showDemoModal('Tidak terhubung. Input data tidak bisa dilakukan sebelum koneksi pulih.');
    return;
  }

  const nama = sanitizeInput(document.getElementById('kgNama').value.trim());
  const detail = sanitizeInput(document.getElementById('kgDetail').value.trim());
  let kelas = normalizeKelas(document.getElementById('kgKelas').value);
  if (!kelas && nama) {
    const nn = nama.toLowerCase().replace(/\s+/g, ' ').trim();
    const hit = STUDENTS.filter(s => s.nama.toLowerCase().replace(/\s+/g, ' ').trim() === nn);
    if (hit.length === 1) {
      kelas = normalizeKelas(hit[0].kelas);
      document.getElementById('kgKelas').value = kelas;
    }
  }

  if (!nama) return showToast('Validasi', 'Nama siswa tidak boleh kosong', 'error');
  if (nama.length < 2) return showToast('Validasi', 'Nama terlalu pendek', 'error');
  if (nama.length > 100) return showToast('Validasi', 'Nama terlalu panjang', 'error');
  if (!kelas || !ALLOWED_KELAS.includes(kelas)) return showToast('Validasi', 'Pilih kelas yang valid', 'error');
  const pelanggaran = KG_KEYS.filter(k => kgSelected.has(k));
  if (!pelanggaran.length) return showToast('Validasi', 'Pilih minimal satu jenis pelanggaran', 'error');

  const rl = _RateLimit.check('submit_kegiatan');
  if (!rl.allowed) return showToast('Terlalu cepat', `Tunggu ${rl.remaining} detik sebelum input lagi`, 'error');

  const btn = document.getElementById('kgSubmitBtn');
  btn.classList.add('loading'); btn.disabled = true;
  _RateLimit.increment('submit_kegiatan');

  try {
    const res = await apiWrite({
      table: 'pelanggaran_kegiatan',
      action: 'insert',
      data: { nama, kelas, pelanggaran, detail }
    });
    btn.classList.remove('loading'); btn.disabled = false;
    if (res?.offline) {
      showToast('Tersimpan offline', `${escHtml(nama)} akan dikirim saat online`, 'info');
    } else {
      showToast('Berhasil!', `Pelanggaran kegiatan ${escHtml(nama)} tersimpan`, 'success');
    }
    resetKegiatanForm();
    loadKegiatanRecent();
  } catch (e) {
    btn.classList.remove('loading'); btn.disabled = false;
    showToast('Error', e.message || 'Gagal menyimpan data', 'error');
  }
}

async function loadKegiatanRecent() {
  const body = document.getElementById('kgRecentBody');
  if (!body) return;
  const empty = msg => { body.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:30px"><div class="empty-title" style="font-size:14px">${msg}</div></div></td></tr>`; };
  if (demoMode || !window._supa) return empty('Belum ada entri hari ini');
  try {
    const { start, end } = getWIBDateRange(getWIBDate());
    const { data, error } = await window._supa.from('pelanggaran_kegiatan').select('*')
      .gte('waktu_input', start).lte('waktu_input', end)
      .order('waktu_input', { ascending: false }).limit(5);
    if (error) { console.warn('[kegiatan] recent error:', error.message); return empty('Gagal memuat entri'); }
    if (!data || !data.length) return empty('Belum ada entri hari ini');
    body.innerHTML = data.map(d => `<tr>
      <td class="td-name">${escHtml(d.nama)}</td>
      <td class="td-class">${escHtml(d.kelas)}</td>
      <td>${kgBadges(d.pelanggaran)}</td>
      <td class="td-time">${formatTime(d.waktu_input)}</td></tr>`).join('');
  } catch (e) {
    empty('Gagal memuat entri');
  }
}

// ---------- Riwayat / rekap ----------
// Pindahkan "pil" penanda tab aktif (geser halus) sesuai posisi tombol aktif
function positionSegIndicator(animate) {
  const wrap = document.getElementById('riwayatTabs');
  if (!wrap) return;
  const ind = wrap.querySelector('.seg-indicator');
  const act = wrap.querySelector('.seg-tab.active');
  if (!ind || !act || !act.offsetWidth) return; // halaman belum tampil
  if (!animate) ind.style.transition = 'none';
  ind.style.width = act.offsetWidth + 'px';
  ind.style.transform = 'translateX(' + act.offsetLeft + 'px)';
  if (!animate) { void ind.offsetWidth; ind.style.transition = ''; }
}
window.addEventListener('resize', () => positionSegIndicator(false));

let _riwayatTab = 'gerbang';
function switchRiwayatTab(tab) {
  const isKg = tab === 'kegiatan';
  const changed = _riwayatTab !== tab;
  const dir = isKg ? 'from-right' : 'from-left';
  _riwayatTab = tab;
  document.querySelectorAll('#riwayatTabs .seg-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  positionSegIndicator(changed);
  const g = document.getElementById('riwayatGerbangWrap');
  const k = document.getElementById('riwayatKegiatanWrap');
  if (g) g.style.display = isKg ? 'none' : '';
  if (k) k.style.display = isKg ? '' : 'none';
  // Animasi konten yang masuk (geser + fade), diulang setiap pindah tab
  const incoming = isKg ? k : g;
  if (incoming && changed) {
    incoming.classList.remove('tab-in-from-right', 'tab-in-from-left');
    void incoming.offsetWidth;
    incoming.classList.add(dir === 'from-right' ? 'tab-in-from-right' : 'tab-in-from-left');
  }
  if (isKg) {
    const d = document.getElementById('kgRekapDate');
    const m = document.getElementById('kgRekapMonth');
    if (d && !d.value) d.value = getWIBDate();
    if (m && !m.value) m.value = getWIBDate().slice(0, 7);
    loadRekapKegiatan();
  }
}

function onKgRekapModeChange() {
  const bulanan = document.getElementById('kgRekapMode').value === 'bulanan';
  document.getElementById('kgRekapDate').style.display = bulanan ? 'none' : '';
  document.getElementById('kgRekapMonth').style.display = bulanan ? '' : 'none';
  loadRekapKegiatan();
}

async function loadRekapKegiatan() {
  if (!currentRole || !ROLES[currentRole]) return;
  const bulanan = document.getElementById('kgRekapMode').value === 'bulanan';
  let start, end, title;
  if (bulanan) {
    const m = document.getElementById('kgRekapMonth').value;
    if (!/^\d{4}-\d{2}$/.test(m)) return;
    const [y, mm] = m.split('-').map(Number);
    const last = new Date(y, mm, 0).getDate();
    start = new Date(`${m}-01T00:00:00+07:00`).toISOString();
    end = new Date(`${m}-${String(last).padStart(2, '0')}T23:59:59.999+07:00`).toISOString();
    title = 'Rekap bulan ' + new Date(`${m}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } else {
    const d = document.getElementById('kgRekapDate').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    ({ start, end } = getWIBDateRange(d));
    title = 'Data tanggal ' + formatDateID(d);
  }
  document.getElementById('kgRekapTitle').textContent = title;

  if (demoMode || !window._supa) { kgRekapData = []; renderRekapKegiatan(); return; }
  try {
    let q = window._supa.from('pelanggaran_kegiatan').select('*')
      .gte('waktu_input', start).lte('waktu_input', end)
      .order('waktu_input', { ascending: false });
    const kelas = document.getElementById('kgRekapKelas').value;
    if (kelas && ALLOWED_KELAS.includes(kelas)) q = q.eq('kelas', kelas);
    const { data, error } = await q;
    if (error) { showToast('Error', 'Gagal memuat rekap kegiatan', 'error'); return; }
    kgRekapData = data || [];
    renderRekapKegiatan();
  } catch (e) {
    showToast('Error', 'Gagal memuat rekap kegiatan', 'error');
  }
}

function renderRekapKegiatan() {
  const data = kgRekapData;
  const counts = Object.fromEntries(KG_KEYS.map(k => [k, 0]));
  data.forEach(d => (Array.isArray(d.pelanggaran) ? d.pelanggaran : []).forEach(k => { if (k in counts) counts[k]++; }));
  const siswa = new Set(data.map(d => (d.nama || '').toLowerCase().trim() + '|' + d.kelas)).size;
  document.getElementById('kgStats').innerHTML =
    `<div class="kg-stat total"><div class="kg-stat-val">${data.length}</div><div class="kg-stat-lbl">Catatan (${siswa} siswa)</div></div>` +
    KG_TYPES.map(t => `<div class="kg-stat"><div class="kg-stat-val">${counts[t.key]}</div><div class="kg-stat-lbl">${escHtml(t.label)}</div></div>`).join('');

  const body = document.getElementById('kgRekapBody');
  if (!data.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon"><i data-lucide="inbox" style="width:28px;height:28px;color:var(--cyan)"></i></div><div class="empty-title">Tidak ada pelanggaran kegiatan pada periode ini</div></div></td></tr>`;
    lucide.createIcons();
    return;
  }
  const bulanan = document.getElementById('kgRekapMode').value === 'bulanan';
  const fmtWaktu = iso => bulanan
    ? new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : formatTime(iso);
  body.innerHTML = data.map((d, i) => `<tr>
    <td class="col-no" style="color:var(--white-dim);font-size:12px">${i + 1}</td>
    <td class="td-name">${escHtml(d.nama)}</td>
    <td class="td-class">${escHtml(d.kelas)}</td>
    <td>${kgBadges(d.pelanggaran)}</td>
    <td class="td-detail col-detail">${escHtml(d.detail || '-')}</td>
    <td class="td-time col-time">${fmtWaktu(d.waktu_input)}</td>
    <td>${kgActionButtons(d)}</td>
  </tr>`).join('');
  lucide.createIcons();
}


// ---------- Aksi edit & hapus (guru / sekretaris) ----------
// Delegasi di level dokumen: tombol tetap berfungsi walau tabel dirender ulang
// atau form input belum pernah dibuka (sebelumnya listener hanya terpasang di initKegiatanForm).
function kgActionButtons(d) {
  if (!currentRole || !['sekretaris', 'guru'].includes(currentRole)) return '';
  const id = escHtml(String(d.id));
  const nama = escHtml(d.nama || '');
  return `<div class="kg-actions" style="display:flex;gap:6px">
    <button type="button" class="btn-delete" title="Edit" data-kg-edit="${id}"><i data-lucide="pencil" style="width:13px;height:13px"></i></button>
    <button type="button" class="btn-delete" title="Hapus" data-kg-del="${id}" data-kg-nama="${nama}"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>
  </div>`;
}

document.addEventListener('click', e => {
  const del = e.target.closest('[data-kg-del]');
  if (del) { askDeleteKegiatan(del.dataset.kgDel, del.dataset.kgNama || ''); return; }
  const ed = e.target.closest('[data-kg-edit]');
  if (ed) openEditKegiatan(ed.dataset.kgEdit);
});

let kgEditId = null;
let kgEditSelected = new Set();

function kgFindRecord(id) {
  return kgRekapData.find(d => d.id === id) || kgGuruAll.find(d => d.id === id) || null;
}

function ensureKgEditModal() {
  let m = document.getElementById('kgEditModal');
  if (m) return m;
  m = document.createElement('div');
  m.className = 'modal-overlay';
  m.id = 'kgEditModal';
  m.innerHTML = `<div class="modal-box" style="max-width:520px;width:calc(100% - 32px);text-align:left;max-height:90vh;overflow:auto">
    <div class="modal-title" style="text-align:left">Edit Pelanggaran Kegiatan</div>
    <div class="form-group" style="margin-top:12px"><label>Nama Siswa *</label>
      <input type="text" class="form-input" id="kgEditNama" maxlength="100" autocomplete="off"></div>
    <div class="form-group" style="margin-top:10px"><label>Kelas *</label>
      <select class="form-select" id="kgEditKelas" translate="no"></select></div>
    <div class="form-group" style="margin-top:10px"><label>Jenis Pelanggaran * <span class="kg-hint">(boleh lebih dari satu)</span></label>
      <div class="kg-grid" id="kgEditTypeGrid"></div></div>
    <div class="form-group" style="margin-top:10px"><label>Keterangan / Detail</label>
      <textarea class="form-textarea" id="kgEditDetail" maxlength="500" rows="3"></textarea></div>
    <div class="modal-btns" style="margin-top:16px">
      <button type="button" class="btn-cancel" id="kgEditCancel">Batalkan</button>
      <button type="button" class="btn-danger" id="kgEditSave" style="background:var(--cyan,#2dd4bf);color:#06121f">Simpan</button>
    </div></div>`;
  document.body.appendChild(m);
  document.getElementById('kgEditKelas').innerHTML =
    ALLOWED_KELAS.map(k => `<option value="${escHtml(k)}">${escHtml(k)}</option>`).join('');
  document.getElementById('kgEditTypeGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-kg-etype]');
    if (!b || !KG_KEYS.includes(b.dataset.kgEtype)) return;
    const k = b.dataset.kgEtype;
    if (kgEditSelected.has(k)) kgEditSelected.delete(k); else kgEditSelected.add(k);
    renderKgEditTypes();
  });
  document.getElementById('kgEditCancel').addEventListener('click', closeEditKegiatan);
  document.getElementById('kgEditSave').addEventListener('click', saveEditKegiatan);
  m.addEventListener('mousedown', e => { if (e.target === m) closeEditKegiatan(); });
  return m;
}

function renderKgEditTypes() {
  const grid = document.getElementById('kgEditTypeGrid');
  if (!grid) return;
  grid.innerHTML = KG_TYPES.map(t => `
    <button type="button" class="violation-btn kg-chip${kgEditSelected.has(t.key) ? ' selected kg' : ''}" data-kg-etype="${t.key}">
      <i data-lucide="${t.icon}" style="width:16px;height:16px"></i> ${escHtml(t.label)}
    </button>`).join('');
  lucide.createIcons();
}

function openEditKegiatan(id) {
  if (!currentRole || !['sekretaris', 'guru'].includes(currentRole)) {
    showToast('Akses Ditolak', 'Anda tidak memiliki izin mengedit data', 'error');
    return;
  }
  const n = Number(id);
  const d = Number.isInteger(n) && n > 0 ? kgFindRecord(n) : null;
  if (!d) { showToast('Error', 'Data tidak ditemukan, muat ulang daftar', 'error'); return; }
  const m = ensureKgEditModal();
  kgEditId = n;
  kgEditSelected = new Set((Array.isArray(d.pelanggaran) ? d.pelanggaran : []).filter(k => KG_KEYS.includes(k)));
  document.getElementById('kgEditNama').value = d.nama || '';
  document.getElementById('kgEditKelas').value = d.kelas || '';
  document.getElementById('kgEditDetail').value = d.detail || '';
  renderKgEditTypes();
  m.classList.add('open');
}

function closeEditKegiatan() {
  document.getElementById('kgEditModal')?.classList.remove('open');
  kgEditId = null;
}

async function saveEditKegiatan() {
  if (!currentRole || !['sekretaris', 'guru'].includes(currentRole)) return;
  const id = kgEditId;
  if (!id) return;
  const nama = sanitizeInput(document.getElementById('kgEditNama').value.trim());
  const kelas = normalizeKelas(document.getElementById('kgEditKelas').value);
  const detail = sanitizeInput(document.getElementById('kgEditDetail').value.trim());
  const pelanggaran = KG_KEYS.filter(k => kgEditSelected.has(k));
  if (!nama || nama.length < 2) return showToast('Validasi', 'Nama siswa tidak boleh kosong', 'error');
  if (nama.length > 100) return showToast('Validasi', 'Nama terlalu panjang', 'error');
  if (!kelas || !ALLOWED_KELAS.includes(kelas)) return showToast('Validasi', 'Pilih kelas yang valid', 'error');
  if (!pelanggaran.length) return showToast('Validasi', 'Pilih minimal satu jenis pelanggaran', 'error');
  const btn = document.getElementById('kgEditSave');
  btn.disabled = true;
  try {
    const res = await apiWrite({
      table: 'pelanggaran_kegiatan', action: 'update',
      data: { nama, kelas, pelanggaran, detail }, filter: { id }
    });
    const patch = { nama, kelas, pelanggaran, detail };
    [kgRekapData, kgGuruAll].forEach(list => {
      const i = list.findIndex(d => d.id === id);
      if (i !== -1) list[i] = { ...list[i], ...patch };
    });
    closeEditKegiatan();
    renderRekapKegiatan();
    if (kgGuruInit) filterGuruKegiatan();
    loadKegiatanToday();
    loadKegiatanRecent();
    showToast(res?.offline ? 'Tersimpan offline' : 'Tersimpan', res?.offline ? 'Perubahan dikirim saat online' : 'Perubahan berhasil disimpan', res?.offline ? 'info' : 'success');
  } catch (e) {
    showToast('Error', e.message || 'Gagal menyimpan perubahan', 'error');
  } finally {
    btn.disabled = false;
  }
}

function askDeleteKegiatan(id, name) {
  if (!currentRole || !['sekretaris', 'guru'].includes(currentRole)) {
    showToast('Akses Ditolak', 'Anda tidak memiliki izin menghapus data', 'error');
    return;
  }
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) { showToast('Error', 'ID tidak valid', 'error'); return; }
  deleteTargetId = null;
  deleteKegiatanId = n;
  const msg = document.getElementById('confirmMsg');
  if (msg) msg.textContent = `Hapus pelanggaran kegiatan "${name || 'data ini'}"? Tindakan ini tidak bisa dibatalkan.`;
  document.getElementById('confirmModal').classList.add('open');
}

async function confirmDeleteKegiatan() {
  const id = deleteKegiatanId;
  closeModal();
  if (!id || !currentRole || !['sekretaris', 'guru'].includes(currentRole)) return;
  try {
    await apiWrite({ table: 'pelanggaran_kegiatan', action: 'delete', filter: { id } });
    kgRekapData = kgRekapData.filter(d => d.id !== id);
    kgGuruAll = kgGuruAll.filter(d => d.id !== id);
    renderRekapKegiatan();
    if (kgGuruInit) filterGuruKegiatan();
    loadKegiatanRecent();
    loadKegiatanToday();
    showToast('Dihapus', 'Data berhasil dihapus', 'info');
  } catch (e) {
    showToast('Error', e.message || 'Gagal menghapus data', 'error');
  }
}

function csvCell(v) {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // cegah formula injection di Excel
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportRekapKegiatanCSV() {
  if (!kgRekapData.length) { showToast('Kosong', 'Tidak ada data untuk diunduh', 'info'); return; }
  const rows = [['Tanggal', 'Waktu', 'Nama', 'Kelas', 'Pelanggaran', 'Detail']];
  kgRekapData.forEach(d => {
    const dt = new Date(d.waktu_input);
    rows.push([
      dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
      formatTime(d.waktu_input),
      d.nama, d.kelas,
      (Array.isArray(d.pelanggaran) ? d.pelanggaran : []).map(k => KG_LABEL[k] || k).join('; '),
      d.detail || ''
    ]);
  });
  const csv = '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'pelanggaran-kegiatan-' + getWIBDate() + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

window.openInputChooser = openInputChooser;
window.openInputSheet = openInputSheet;
window.closeInputSheet = closeInputSheet;
window.toggleInputSheet = toggleInputSheet;
window.openInputGerbang = openInputGerbang;
window.openInputKegiatan = openInputKegiatan;
window.submitKegiatan = submitKegiatan;
window.switchRiwayatTab = switchRiwayatTab;
window.onKgRekapModeChange = onKgRekapModeChange;
window.loadRekapKegiatan = loadRekapKegiatan;
window.exportRekapKegiatanCSV = exportRekapKegiatanCSV;

// ============================================================
// UPDATE 2.0.1 - pelanggaran kegiatan di dashboard, Panel Guru, grafik, ekspor
// ============================================================
let kgGuruAll = [];
let kgGuruFiltered = [];
let kgGuruInit = false;

function monthRangeISO(m) {
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  const [y, mm] = m.split('-').map(Number);
  const last = new Date(y, mm, 0).getDate();
  return {
    start: new Date(`${m}-01T00:00:00+07:00`).toISOString(),
    end: new Date(`${m}-${String(last).padStart(2, '0')}T23:59:59.999+07:00`).toISOString(),
    label: new Date(`${m}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  };
}

function kgCounts(rows) {
  const counts = Object.fromEntries(KG_KEYS.map(k => [k, 0]));
  rows.forEach(d => (Array.isArray(d.pelanggaran) ? d.pelanggaran : []).forEach(k => { if (k in counts) counts[k]++; }));
  return counts;
}

function kgStatsHTML(rows) {
  const counts = kgCounts(rows);
  const siswa = new Set(rows.map(d => (d.nama || '').toLowerCase().trim() + '|' + d.kelas)).size;
  return `<div class="kg-stat total"><div class="kg-stat-val">${rows.length}</div><div class="kg-stat-lbl">Catatan (${siswa} siswa)</div></div>` +
    KG_TYPES.map(t => `<div class="kg-stat"><div class="kg-stat-val">${counts[t.key]}</div><div class="kg-stat-lbl">${escHtml(t.label)}</div></div>`).join('');
}

// ---------- Dashboard: ringkasan hari ini ----------
async function loadKegiatanToday() {
  const totalEl = document.getElementById('kgTodayTotal');
  if (!totalEl) return;
  if (demoMode || !window._supa) return;
  try {
    const { start, end } = getWIBDateRange(getWIBDate());
    const { data, error } = await window._supa.from('pelanggaran_kegiatan').select('nama,kelas,pelanggaran')
      .gte('waktu_input', start).lte('waktu_input', end);
    if (error) { console.warn('[kegiatan] today error:', error.message); return; }
    const rows = data || [];
    const siswa = new Set(rows.map(d => (d.nama || '').toLowerCase().trim() + '|' + d.kelas)).size;
    totalEl.textContent = rows.length;
    document.getElementById('kgTodaySub').textContent = rows.length ? `catatan dari ${siswa} siswa` : 'belum ada catatan';
    const counts = kgCounts(rows);
    document.getElementById('kgTodayChips').innerHTML = KG_TYPES.filter(t => counts[t.key] > 0)
      .map(t => `<span class="badge kg-badge">${escHtml(t.label)} · ${counts[t.key]}</span>`).join(' ');
  } catch (e) {
    console.warn('[kegiatan] today gagal:', e.message);
  }
}

function openRekapKegiatan() {
  navigateTo('riwayat', document.querySelector('.sidebar-btn[data-page="riwayat"]'));
  switchRiwayatTab('kegiatan');
}

// ---------- Panel Guru ----------
function initGuruKegiatan() {
  if (kgGuruInit) return;
  kgGuruInit = true;
  const kel = document.getElementById('gkKelas');
  if (kel) kel.innerHTML = '<option value="">Semua Kelas</option>' + ALLOWED_KELAS.map(k => `<option>${escHtml(k)}</option>`).join('');
  const jen = document.getElementById('gkJenis');
  if (jen) jen.innerHTML = '<option value="">Semua Jenis</option>' + KG_TYPES.map(t => `<option value="${t.key}">${escHtml(t.label)}</option>`).join('');
}

function switchGuruTab(tab) {
  const isKg = tab === 'kegiatan';
  document.querySelectorAll('#guruTabs .seg-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const g = document.getElementById('guruGerbangWrap');
  const k = document.getElementById('guruKegiatanWrap');
  if (g) g.style.display = isKg ? 'none' : '';
  if (k) k.style.display = isKg ? '' : 'none';
  if (isKg) {
    initGuruKegiatan();
    const m = document.getElementById('gkMonth');
    if (m && !m.value) m.value = getWIBDate().slice(0, 7);
    const mine = document.getElementById('guruFilterKelas')?.value;
    if (mine && !document.getElementById('gkKelas').value) document.getElementById('gkKelas').value = mine;
    loadGuruKegiatan();
  }
}

async function loadGuruKegiatan() {
  if (!currentRole || !ROLES[currentRole]) return;
  const range = monthRangeISO(document.getElementById('gkMonth').value);
  if (!range) return;
  if (demoMode || !window._supa) { kgGuruAll = []; filterGuruKegiatan(); return; }
  try {
    const { data, error } = await window._supa.from('pelanggaran_kegiatan').select('*')
      .gte('waktu_input', range.start).lte('waktu_input', range.end)
      .order('waktu_input', { ascending: false }).limit(2000);
    if (error) { showToast('Error', 'Gagal memuat data kegiatan', 'error'); return; }
    kgGuruAll = data || [];
    filterGuruKegiatan();
  } catch (e) {
    showToast('Error', 'Gagal memuat data kegiatan', 'error');
  }
}

function filterGuruKegiatan() {
  const q = (document.getElementById('gkSearch')?.value || '').toLowerCase();
  const kelas = document.getElementById('gkKelas')?.value || '';
  const jenis = document.getElementById('gkJenis')?.value || '';
  kgGuruFiltered = kgGuruAll.filter(d =>
    (d.nama || '').toLowerCase().includes(q) &&
    (!kelas || d.kelas === kelas) &&
    (!jenis || (Array.isArray(d.pelanggaran) && d.pelanggaran.includes(jenis)))
  );
  renderGuruKegiatan();
}

function renderGuruKegiatan() {
  const rows = kgGuruFiltered;
  document.getElementById('gkStats').innerHTML = kgStatsHTML(rows);
  document.getElementById('gkCount').textContent = rows.length + ' data ditemukan';
  const body = document.getElementById('gkBody');
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon"><i data-lucide="inbox" style="width:28px;height:28px;color:var(--cyan)"></i></div><div class="empty-title">Tidak ada data</div></div></td></tr>`;
    lucide.createIcons();
    return;
  }
  body.innerHTML = rows.map((d, i) => `<tr>
    <td class="col-no" style="color:var(--white-dim);font-size:12px">${i + 1}</td>
    <td style="font-weight:600">${escHtml(d.nama)}</td>
    <td style="color:var(--white-dim)">${escHtml(d.kelas)}</td>
    <td>${kgBadges(d.pelanggaran)}</td>
    <td class="col-detail">${escHtml(d.detail || '-')}</td>
    <td class="col-time">${new Date(d.waktu_input).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
    <td>${kgActionButtons(d)}</td>
  </tr>`).join('');
  lucide.createIcons();
}

// ---------- Grafik dashboard Guru ----------
async function renderGuruChartKegiatan() {
  const canvas = document.getElementById('guruChartKegiatan');
  if (!canvas || typeof Chart === 'undefined') return;
  let rows = [];
  if (!demoMode && window._supa) {
    try {
      const startDate = new Date(Date.now() + 7 * 3600 * 1000 - 30 * 86400000).toISOString().split('T')[0];
      const { data, error } = await window._supa.from('pelanggaran_kegiatan').select('pelanggaran,waktu_input')
        .gte('waktu_input', getWIBDateRange(startDate).start).lte('waktu_input', getWIBDateRange(getWIBDate()).end);
      if (error) { console.warn('[kegiatan] chart error:', error.message); return; }
      rows = data || [];
    } catch (e) { return; }
  }
  const counts = kgCounts(rows);
  const total = rows.length;
  const sub = document.getElementById('guruChartKegiatanSub');
  if (sub) sub.textContent = total ? `${total} catatan dalam 30 hari terakhir` : 'Belum ada data';
  const textColor = cssVar('--white-dim', '#9CA3AF');
  const gridColor = 'rgba(128,128,128,0.15)';
  if (guruChartInstances.kegiatan) guruChartInstances.kegiatan.destroy();
  guruChartInstances.kegiatan = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: KG_TYPES.map(t => t.label),
      datasets: [{ label: 'Jumlah', data: KG_TYPES.map(t => counts[t.key]), backgroundColor: '#f0606a', borderRadius: 6 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { color: textColor, precision: 0, font: { size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

// ---------- Ekspor Excel / PDF ----------
function kgRowsForExport(rows) {
  return rows.map((d, i) => {
    const dt = new Date(d.waktu_input);
    return [
      i + 1,
      dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }),
      formatTime(d.waktu_input),
      d.nama, d.kelas,
      (Array.isArray(d.pelanggaran) ? d.pelanggaran : []).map(k => KG_LABEL[k] || k).join(', '),
      d.detail || ''
    ];
  });
}

async function exportKegiatanExcel(rows, label, fileBase, title) {
  await ensureXLSX();
  if (!rows.length) return showToast('Info', 'Tidak ada data untuk diekspor', 'info');
  const aoa = [
    ['DAFTAR PELANGGARAN KEGIATAN SISWA'],
    ['SMKN 6 Tangerang Selatan'],
    [label],
    [],
    ['NO', 'TANGGAL', 'WAKTU', 'NAMA', 'KELAS', 'PELANGGARAN', 'KETERANGAN'],
    ...kgRowsForExport(rows)
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:4},{wch:12},{wch:10},{wch:30},{wch:12},{wch:40},{wch:36}];
  const counts = kgCounts(rows);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['RINGKASAN PELANGGARAN KEGIATAN'], [label], [],
    ['JENIS PELANGGARAN', 'JUMLAH'],
    ...KG_TYPES.map(t => [t.label, counts[t.key]]),
    ['Total catatan', rows.length]
  ]);
  ws2['!cols'] = [{wch:34},{wch:10}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pelanggaran Kegiatan');
  XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadFile(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileBase + '.xlsx', title);
}

async function exportKegiatanPDF(rows, label, fileBase, title) {
  await ensurePDF();
  if (!rows.length) return showToast('Info', 'Tidak ada data untuk diekspor', 'info');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('DAFTAR PELANGGARAN KEGIATAN SISWA', 14, 18);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('SMKN 6 Tangerang Selatan', 14, 25);
  doc.text(label, 14, 31);
  doc.line(14, 34, 196, 34);
  doc.autoTable({
    startY: 38,
    head: [['#', 'Tanggal', 'Waktu', 'Nama', 'Kelas', 'Pelanggaran', 'Keterangan']],
    body: kgRowsForExport(rows),
    headStyles: { fillColor: [240, 68, 78], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [250, 245, 245] },
    columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 22 }, 2: { cellWidth: 18 } },
    margin: { left: 14, right: 14 }
  });
  const counts = kgCounts(rows);
  const y = (doc.lastAutoTable?.finalY || 40) + 8;
  doc.setFontSize(9);
  doc.text('Ringkasan: ' + KG_TYPES.filter(t => counts[t.key]).map(t => `${t.label} ${counts[t.key]}`).join(', ') + ` | Total ${rows.length} catatan`, 14, y, { maxWidth: 182 });
  downloadFile(new Blob([doc.output('arraybuffer')], { type: 'application/pdf' }), fileBase + '.pdf', title);
}

function kgRekapLabel() {
  const bulanan = document.getElementById('kgRekapMode').value === 'bulanan';
  if (bulanan) return 'Rekap bulan ' + (monthRangeISO(document.getElementById('kgRekapMonth').value)?.label || '');
  return 'Tanggal: ' + formatDateID(document.getElementById('kgRekapDate').value);
}
function kgRekapFileBase() {
  const bulanan = document.getElementById('kgRekapMode').value === 'bulanan';
  return 'Kegiatan_' + (bulanan ? document.getElementById('kgRekapMonth').value : document.getElementById('kgRekapDate').value);
}
function exportRekapKegiatanExcel() { return exportKegiatanExcel(kgRekapData, kgRekapLabel(), kgRekapFileBase(), 'Excel Pelanggaran Kegiatan'); }
function exportRekapKegiatanPDF() { return exportKegiatanPDF(kgRekapData, kgRekapLabel(), kgRekapFileBase(), 'PDF Pelanggaran Kegiatan'); }
function guruKgLabel() { return 'Rekap bulan ' + (monthRangeISO(document.getElementById('gkMonth').value)?.label || ''); }
function exportGuruKegiatanExcel() { return exportKegiatanExcel(kgGuruFiltered, guruKgLabel(), 'PanelGuru_Kegiatan_' + document.getElementById('gkMonth').value, 'Excel Kegiatan Guru'); }
function exportGuruKegiatanPDF() { return exportKegiatanPDF(kgGuruFiltered, guruKgLabel(), 'PanelGuru_Kegiatan_' + document.getElementById('gkMonth').value, 'PDF Kegiatan Guru'); }

window.openRekapKegiatan = openRekapKegiatan;
window.switchGuruTab = switchGuruTab;
window.loadGuruKegiatan = loadGuruKegiatan;
window.filterGuruKegiatan = filterGuruKegiatan;
window.exportRekapKegiatanExcel = exportRekapKegiatanExcel;
window.exportRekapKegiatanPDF = exportRekapKegiatanPDF;
window.exportGuruKegiatanExcel = exportGuruKegiatanExcel;
window.exportGuruKegiatanPDF = exportGuruKegiatanPDF;

window.navigateTo = typeof navigateTo !== "undefined" ? navigateTo : function(){};
window.toggleSidebar = typeof toggleSidebar !== "undefined" ? toggleSidebar : function(){};
window.openAdminPage = typeof openAdminPage !== "undefined" ? openAdminPage : function(){};
window.switchAdminTab = typeof switchAdminTab !== "undefined" ? switchAdminTab : function(){};
window.submitData = typeof submitData !== "undefined" ? submitData : function(){};
window.toggleViolation = typeof toggleViolation !== "undefined" ? toggleViolation : function(){};
window.onNamaInput = typeof onNamaInput !== "undefined" ? onNamaInput : function(){};
window.onNamaKey = typeof onNamaKey !== "undefined" ? onNamaKey : function(){};
window.selectStudent = typeof selectStudent !== "undefined" ? selectStudent : function(){};
window.acAdmin = typeof acAdmin !== "undefined" ? acAdmin : function(){};
window.acAdminKey = typeof acAdminKey !== "undefined" ? acAdminKey : function(){};
window.acAdminSelect = typeof acAdminSelect !== "undefined" ? acAdminSelect : function(){};
window.scheduleAutoSave = typeof scheduleAutoSave !== "undefined" ? scheduleAutoSave : function(){};
window.filterData = typeof filterData !== "undefined" ? filterData : function(){};
window.filterGuruData = typeof filterGuruData !== "undefined" ? filterGuruData : function(){};
window.initKelasSaya = typeof initKelasSaya !== "undefined" ? initKelasSaya : function(){};
window.saveKelasSaya = typeof saveKelasSaya !== "undefined" ? saveKelasSaya : function(){};
window.loadSiswaPerhatian = typeof loadSiswaPerhatian !== "undefined" ? loadSiswaPerhatian : function(){};
window.loadDashboardGuruCharts = typeof loadDashboardGuruCharts !== "undefined" ? loadDashboardGuruCharts : function(){};
window.renderSiswaPerhatian = typeof renderSiswaPerhatian !== "undefined" ? renderSiswaPerhatian : function(){};
window.showRiwayatSiswa = typeof showRiwayatSiswa !== "undefined" ? showRiwayatSiswa : function(){};
window.loadRiwayat = typeof loadRiwayat !== "undefined" ? loadRiwayat : function(){};
window.renderRiwayat = typeof renderRiwayat !== "undefined" ? renderRiwayat : function(){};
window.askDelete = typeof askDelete !== "undefined" ? askDelete : function(){};
window.closeModal = typeof closeModal !== "undefined" ? closeModal : function(){};
window.confirmDelete = typeof confirmDelete !== "undefined" ? confirmDelete : function(){};
window.editRecord = typeof editRecord !== "undefined" ? editRecord : function(){};
window.exportExcel = typeof exportExcel !== "undefined" ? exportExcel : function(){};
window.exportPDF = typeof exportPDF !== "undefined" ? exportPDF : function(){};
window.exportGuruExcel = typeof exportGuruExcel !== "undefined" ? exportGuruExcel : function(){};
window.exportGuruPDF = typeof exportGuruPDF !== "undefined" ? exportGuruPDF : function(){};
window.exportRiwayatExcel = typeof exportRiwayatExcel !== "undefined" ? exportRiwayatExcel : function(){};
window.exportRiwayatPDF = typeof exportRiwayatPDF !== "undefined" ? exportRiwayatPDF : function(){};
window.exportRekapBulananExcel = typeof exportRekapBulananExcel !== "undefined" ? exportRekapBulananExcel : function(){};
window.saveAdminJadwal = typeof saveAdminJadwal !== "undefined" ? saveAdminJadwal : function(){};
window.clearAllJadwal = typeof clearAllJadwal !== "undefined" ? clearAllJadwal : function(){};
window.onJadwalImagePicked = typeof onJadwalImagePicked !== "undefined" ? onJadwalImagePicked : function(){};
window.resetDay = typeof resetDay !== "undefined" ? resetDay : function(){};
window.renderAdminForm = typeof renderAdminForm !== "undefined" ? renderAdminForm : function(){};
window.triggerInstall = typeof triggerInstall !== "undefined" ? triggerInstall : function(){ if(typeof showInstallBanner === "function") showInstallBanner(); };
window.toggleAbsensi = typeof toggleAbsensi !== "undefined" ? toggleAbsensi : function(){};
window.verifyAdmin = typeof verifyAdmin !== "undefined" ? verifyAdmin : function(){};
window.closeWelcomeAndGo = typeof closeWelcomeAndGo !== "undefined" ? closeWelcomeAndGo : function(){};
window.closeWhatsNew = typeof closeWhatsNew !== "undefined" ? closeWhatsNew : function(){};
window.handleSettingNav = typeof handleSettingNav !== "undefined" ? handleSettingNav : function(){};
window.closeMobileSettingMenu = typeof closeMobileSettingMenu !== "undefined" ? closeMobileSettingMenu : function(){};

})(window, document, console);

/* ==================== NEXT SCRIPT BLOCK ==================== */

(function() {
'use strict';

// Manifest PWA sekarang berupa file statis asli: manifest.json (di-link
// langsung lewat <link rel="manifest" href="manifest.json"> di <head>).
// Ini menggantikan pendekatan lama (Blob URL dibuat lewat JS) yang sering
// gagal memenuhi kriteria "installable" di berbagai browser, sehingga
// event beforeinstallprompt tidak pernah muncul dan tombol Unduh terlihat
// tidak berfungsi.

// ── Service Worker (file fisik sw.js, WAJIB untuk PWA installable) ──────
if (false && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(reg => {
      console.log('[PiketKu SW] Registered, scope:', reg.scope);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available - show subtle toast
            if (typeof showToast === 'function') {
              showToast('Update tersedia', 'Muat ulang halaman untuk versi terbaru', 'info');
            }
          }
        });
      });
    })
    .catch(err => console.warn('[PiketKu SW] Registration failed:', err));
}

// ── Install Prompt (A2HS banner) ─────────────────────────────────────────
window._deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window._deferredPrompt = e;
  showInstallBanner();
});

window.addEventListener('appinstalled', () => {
  hideInstallBanner();
  window._deferredPrompt = null;
  if (typeof showToast === 'function') {
    showToast('Terpasang!', 'PiketKu berhasil dipasang di perangkat ini', 'success');
  }
});

function showInstallBanner() {
  return; // [WEB DEMO] tidak ada pemasangan PWA
  if (document.getElementById('pwaInstallBanner')) return;

  // Don't show if already in standalone
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  const banner = document.createElement('div');
  banner.id = 'pwaInstallBanner';
  banner.style.cssText = [
    'position:fixed','top:16px','right:16px',
    'z-index:9998','display:flex','align-items:center','gap:12px',
    'background:#1c1b19','border:1px solid rgba(94,184,138,0.3)',
    'border-radius:14px','padding:12px 16px','box-shadow:0 8px 32px rgba(0,0,0,0.4)',
    'max-width:calc(100vw - 32px)','min-width:280px',
    'animation:toastIn 280ms cubic-bezier(0.34,1.4,0.64,1) both'
  ].join(';');

  banner.innerHTML = `
    <img src="demo-assets/icon-192.png" style="width:40px;height:40px;object-fit:contain;flex-shrink:0;border-radius:10px;" alt="PiketKu"/>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700;color:#e4e0d8">Unduh PiketKu</div>
      <div style="font-size:11px;color:#8a8680;margin-top:2px">Pasang sebagai aplikasi di perangkat ini</div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button id="pwaInstallBtn" style="background:#5eb88a;border:none;color:#fff;font-weight:700;font-size:12px;padding:7px 16px;border-radius:8px;cursor:pointer;font-family:inherit">Unduh</button>
      <button id="pwaInstallDismiss" style="background:transparent;border:1px solid rgba(255,255,255,0.12);color:#8a8680;font-size:12px;padding:7px 10px;border-radius:8px;cursor:pointer;font-family:inherit">Nanti</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('pwaInstallBtn').onclick = async () => {
    if (!window._deferredPrompt) {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (typeof showToast === 'function') {
        showToast(isIOS ? 'Pasang di iOS' : 'Belum Siap',
          isIOS ? 'Ketuk ikon Bagikan di Safari lalu pilih "Tambah ke Layar Utama"' : 'Coba muat ulang halaman lalu tekan Unduh lagi',
          'info');
      }
      return;
    }
    window._deferredPrompt.prompt();
    const { outcome } = await window._deferredPrompt.userChoice;
    window._deferredPrompt = null;
    hideInstallBanner();
  };

  document.getElementById('pwaInstallDismiss').onclick = () => {
    hideInstallBanner();
    sessionStorage.setItem('pwa_dismissed', '1');
  };
}

function hideInstallBanner() {
  const b = document.getElementById('pwaInstallBanner');
  if (b) b.remove();
}

})();

/* ==================== NEXT SCRIPT BLOCK ==================== */

// ============================================================
//  i18n - Sistem Bahasa Indonesia / English
// ============================================================
const I18N = {
  id: {
    // Sidebar
    nav_main:        'Menu Utama',
    nav_admin_label: 'Admin',
    nav_smart:       'Cerdas',
    nav_system:      'Sistem',
    nav_dashboard:   'Dashboard',
    nav_input:       'Input Data',
    nav_riwayat:     'Riwayat',
    nav_admin:       'Admin Sekretaris',
    nav_guru:        'Panel Guru',
    nav_changelog:   'Changelog',
    nav_setting:     'Profil',
    nav_logout:      'Keluar',
    // Dashboard hero
    hero_title:      'Rekap <span>Pelanggaran</span> Hari Ini',
    hero_sub:        'Pantau data siswa terlambat dan tidak lengkap secara realtime',
    // Stat labels
    stat_late:       'Siswa Terlambat',
    stat_attrib:     'Atribut Tidak Lengkap',
    stat_total:      'Total Pelanggaran',
    stat_late_short: 'Terlambat',
    stat_attrib_short:'Atribut',
    stat_total_short:'Total',
    // Dashboard sections
    lbl_petugas_hari_ini: 'Petugas Piket Hari Ini',
    lbl_absensi_petugas:  'Absensi Petugas Piket Hari Ini',
    lbl_data_pelanggaran: 'Data Pelanggaran',
    lbl_pantau_pelanggaran: 'Pantau Pelanggaran Siswa',
    // Input page
    sec_input_title: '<span>Input Data</span> Pelanggaran',
    sec_input_sub:   'Tambahkan data siswa yang melanggar pada form di bawah ini',
    lbl_nama_siswa:  'Nama Siswa *',
    lbl_kelas:       'Kelas *',
    lbl_jenis_pelanggaran: 'Jenis Pelanggaran *',
    lbl_keterangan:  'Keterangan / Detail Tambahan',
    btn_simpan:      'Simpan Data Pelanggaran',
    // Table headers
    th_nama_siswa:   'Nama Siswa',
    th_kelas:        'Kelas',
    th_pelanggaran:  'Pelanggaran',
    th_detail:       'Detail',
    th_waktu:        'Waktu',
    // Riwayat
    sec_riwayat_title: '<span>Riwayat</span> Data Harian',
    sec_riwayat_sub:   'Lihat data pelanggaran berdasarkan tanggal tertentu',
    lbl_pilih_tanggal: 'Pilih Tanggal:',
    // Filter
    filter_all_class:'Semua Kelas',
    // Login
    login_btn:       'Masuk ke Sistem',
    // Setting page
    setting_title:       'Profil',
    pf_account: 'Akun', pf_pref: 'Preferensi', pf_manage: 'Kelola Profil', pf_notif: 'Notifikasi', pf_lang: 'Bahasa',
    pf_about: 'Tentang & Changelog', pf_install: 'Unduh Aplikasi', pf_name_label: 'Nama tampilan',
    setting_sub:         'Sesuaikan preferensi aplikasi kamu',
    setting_lang_title:  'Bahasa / Language',
    setting_lang_sub:    'Pilih bahasa tampilan aplikasi',
    setting_theme_title: 'Tema Tampilan',
    setting_theme_sub:   'Mode terang / gelap / sistem',
    setting_apk_title:   'Download APK',
    setting_apk_sub:     'Pasang shortcut di layar utama',
    coming_soon:         'Coming Soon',
  },
  en: {
    // Sidebar
    nav_main:        'Main Menu',
    nav_admin_label: 'Admin',
    nav_smart:       'Smart',
    nav_system:      'System',
    nav_dashboard:   'Dashboard',
    nav_input:       'Input Data',
    nav_riwayat:     'History',
    nav_admin:       'Admin Secretary',
    nav_guru:        'Teacher Panel',
    nav_changelog:   'Changelog',
    nav_setting:     'Profile',
    nav_logout:      'Logout',
    // Dashboard hero
    hero_title:      'Today\'s <span>Violation</span> Summary',
    hero_sub:        'Monitor late and incomplete attribute students in realtime',
    // Stat labels
    stat_late:       'Late Students',
    stat_attrib:     'Incomplete Attributes',
    stat_total:      'Total Violations',
    stat_late_short: 'Late',
    stat_attrib_short:'Attribute',
    stat_total_short:'Total',
    // Dashboard sections
    lbl_petugas_hari_ini: 'Today\'s Duty Officers',
    lbl_absensi_petugas:  'Duty Officer Attendance Today',
    lbl_data_pelanggaran: 'Violation Data',
    lbl_pantau_pelanggaran: 'Monitor Student Violations',
    // Input page
    sec_input_title: '<span>Input</span> Violation Data',
    sec_input_sub:   'Add student violation data using the form below',
    lbl_nama_siswa:  'Student Name *',
    lbl_kelas:       'Class *',
    lbl_jenis_pelanggaran: 'Violation Type *',
    lbl_keterangan:  'Notes / Additional Details',
    btn_simpan:      'Save Violation Data',
    // Table headers
    th_nama_siswa:   'Student Name',
    th_kelas:        'Class',
    th_pelanggaran:  'Violation',
    th_detail:       'Detail',
    th_waktu:        'Time',
    // Riwayat
    sec_riwayat_title: '<span>History</span> Daily Data',
    sec_riwayat_sub:   'View violation data by specific date',
    lbl_pilih_tanggal: 'Select Date:',
    // Filter
    filter_all_class:'All Classes',
    // Login
    login_btn:       'Sign In',
    // Setting page
    setting_title:       'Profile',
    pf_account: 'Account', pf_pref: 'Preferences', pf_manage: 'Manage Profile', pf_notif: 'Notifications', pf_lang: 'Language',
    pf_about: 'About & Changelog', pf_install: 'Install App', pf_name_label: 'Display name',
    setting_sub:         'Customize your app preferences',
    setting_lang_title:  'Bahasa / Language',
    setting_lang_sub:    'Choose the app display language',
    setting_theme_title: 'Display Theme',
    setting_theme_sub:   'Light / dark / system mode',
    setting_apk_title:   'Download APK',
    setting_apk_sub:     'Install shortcut on home screen',
    coming_soon:         'Coming Soon',
    setting_profile_title: 'My Profile',
    setting_profile_sub:   'Photo & name saved only on this device',
    setting_profile_placeholder: 'Your name',
    setting_profile_save:  'Save',
    setting_profile_remove:'Remove Photo',
  }
};

let currentLang = localStorage.getItem('piketku_lang') || 'id';

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('piketku_lang', lang);
  const dict = I18N[lang] || I18N.id;

  // Apply data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });

  // Nilai bahasa di baris Profil + sinkron status notifikasi
  const lv = document.getElementById('langRowValue');
  if (lv) lv.textContent = lang === 'id' ? 'Indonesia' : 'English';
  const pb = document.getElementById('pushEnableBtn');
  if (pb && typeof updatePushStatusUI === 'function') updatePushStatusUI(pb.classList.contains('is-on'));

  // Update html lang attribute
  document.documentElement.lang = lang;
}

function setLang(lang) {
  applyLang(lang);
  const label = lang === 'id' ? 'Bahasa Indonesia' : 'English';
  if (typeof showToast === 'function') showToast('Bahasa', label, 'success');
}

// Apply on load
document.addEventListener('DOMContentLoaded', () => {
  applyLang(currentLang);
});

/* ==================== NEXT SCRIPT BLOCK ==================== */

// ============================================================
//  PREMIUM MOTION LAYER - behavior (ripple, stagger, count-up,
//  spotlight tracking, table row reveal). Purely additive:
//  does not touch existing app logic or state.
// ============================================================
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- ripple on interactive buttons ----
  function attachRipple(el, evt) {
    if (reduceMotion) return;
    // avoid stacking ripples on rapid taps (common on mobile lists)
    const existing = el.querySelectorAll('.pk-ripple');
    if (existing.length >= 2) existing[0].remove();
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.6;
    const x = (evt.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (evt.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'pk-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.btn-primary, .btn-action, .btn-save-admin, .btn-danger, .btn-cancel, .violation-btn, .sidebar-btn');
    if (el) attachRipple(el, e);
  }, true);

  // ---- cursor spotlight on cards: DIHAPUS (perf fix) ----
  // Efek radial-gradient cursor-follow ini nempel di kartu yang ikut
  // discroll dan butuh listener mousemove + recompute tiap frame.
  // Dihilangkan total sesuai permintaan supaya scroll lebih ringan.

  // ---- count-up untuk angka statistik ----
  // CATATAN PERFORMA: dulu ada dua sistem count-up jalan bareng - animateCount()
  // versi utama di awal app.js (setInterval, 20 langkah) DAN MutationObserver di
  // sini yang ikut memicu animateCount versi lain tiap textContent berubah.
  // Karena versi utama menulis textContent 20x berturut-turut, observer ini
  // spawn animasi requestAnimationFrame baru di SETIAP tulisan itu - jadi belasan
  // animasi count-up numpuk & rebutan kontrol tiap kali statistik di-refresh
  // (termasuk tiap polling data 30 detik sekali). Makanya dihilangkan; cukup
  // satu sistem count-up saja (yang di animateCount() awal file).

  // ---- staggered reveal for stat/data/form cards on page switch ----
  function staggerReveal(container) {
    if (!container) return;
    if (_pkIsAutoRefresh) return; // PERF FIX #3 - jangan reveal ulang kartu saat auto-refresh
    const items = container.querySelectorAll('.stat-card, .data-card, .form-card, .jadwal-card, .absensi-card');
    items.forEach((el, i) => {
      el.classList.remove('pk-reveal');
      void el.offsetWidth;
      el.style.animationDelay = reduceMotion ? '0ms' : (i * 45) + 'ms';
      el.classList.add('pk-reveal');
    });
  }
  const pageObserver = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.attributeName === 'class' && m.target.classList.contains('active') && m.target.classList.contains('page')) {
        staggerReveal(m.target);
        staggerTableRows(m.target);
      }
    });
  });
  document.querySelectorAll('.page').forEach(p => pageObserver.observe(p, { attributes: true }));
  const initialActive = document.querySelector('.page.active');
  if (initialActive) requestAnimationFrame(() => { staggerReveal(initialActive); staggerTableRows(initialActive); });

  // ---- staggered table row reveal (observes tbody mutations) ----
  function staggerTableRows(scope) {
    (scope || document).querySelectorAll('tbody').forEach(tb => {
      if (tb.dataset.pkWatched) return;
      tb.dataset.pkWatched = '1';
      const revealRows = () => {
        // PERF FIX #3 - saat baris baru datang dari AUTO-REFRESH polling,
        // tampilkan langsung tanpa stagger delay (skip reflow berulang
        // tiap 30 detik). Animasi stagger tetap jalan normal untuk
        // render yang dipicu aksi user (filter, pindah halaman, dll).
        const skipStagger = reduceMotion || _pkIsAutoRefresh;
        Array.from(tb.children).forEach((row, i) => {
          if (row.dataset.pkIn) return;
          row.dataset.pkIn = '1';
          row.classList.add('pk-row-in');
          row.style.animationDelay = skipStagger ? '0ms' : Math.min(i, 14) * 28 + 'ms';
        });
      };
      revealRows();
      new MutationObserver(revealRows).observe(tb, { childList: true });
    });
  }
  staggerTableRows(document);
})();
