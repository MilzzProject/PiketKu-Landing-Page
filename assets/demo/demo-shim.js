/* ============================================================
   PiketKu WEB DEMO shim
   - Menggantikan Supabase SDK, /api/login, /api/write, /api/parse-jadwal
     dengan versi in-memory (data dummy, tidak tersimpan permanen).
   - Semua nama siswa/petugas di sini fiktif.
   ============================================================ */
(function () {
  'use strict';

  // ---------- PRNG deterministik (data konsisten tiap dibuka) ----------
  let _seed = 20260409;
  function rnd() {
    _seed = (_seed * 1664525 + 1013904223) % 4294967296;
    return _seed / 4294967296;
  }
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // ---------- Waktu WIB ----------
  const DAY_MS = 86400000;
  function wibToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }
  function dayBase(daysAgo) {
    return new Date(wibToday() + 'T00:00:00+07:00').getTime() - daysAgo * DAY_MS;
  }
  function dayStr(daysAgo) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(dayBase(daysAgo) + 12 * 3600000));
  }
  function isWeekday(daysAgo) {
    const wd = new Date(dayBase(daysAgo) + 7 * 3600000).getUTCDay();
    return wd >= 1 && wd <= 5;
  }
  function isoAt(daysAgo, minutesFromMidnight) {
    return new Date(dayBase(daysAgo) + minutesFromMidnight * 60000).toISOString();
  }

  // ---------- Roster siswa FIKTIF ----------
  const KELAS = [
    'X RPL 1', 'X RPL 2', 'X TKJ 1', 'X TKJ 2', 'X BC 1', 'X BC 2',
    'XI RPL 1', 'XI RPL 2', 'XI TKJ 1', 'XI TKJ 2', 'XI BC 1', 'XI BC 2',
    'XII RPL 1', 'XII RPL 2', 'XII TKJ 1', 'XII TKJ 2', 'XII BC 1', 'XII BC 2'
  ];
  const FIRST = ['Aditya', 'Alya', 'Anisa', 'Arkan', 'Bagas', 'Bunga', 'Calista', 'Citra', 'Dafa', 'Dewi',
    'Dimas', 'Eka', 'Fadil', 'Farah', 'Gilang', 'Hana', 'Ilham', 'Intan', 'Jihan', 'Kevin',
    'Laras', 'Malik', 'Nabila', 'Naufal', 'Olivia', 'Putra', 'Qori', 'Rafi', 'Salsa', 'Tegar',
    'Ulfa', 'Vino', 'Wulan', 'Yoga', 'Zahra', 'Rizal', 'Mira', 'Dika', 'Sinta', 'Bayu'];
  const LAST = ['Pratama', 'Lestari', 'Saputra', 'Wijaya', 'Nugraha', 'Maharani', 'Kusuma', 'Hidayat', 'Permata',
    'Santoso', 'Anggraini', 'Firmansyah', 'Ramadhani', 'Setiawan', 'Puspita', 'Wibowo', 'Azzahra', 'Putri',
    'Mahendra', 'Salsabila', 'Gunawan', 'Utami', 'Prakoso', 'Amelia', 'Syahputra', 'Kurniawan', 'Oktaviani'];
  const MID = ['', '', '', 'Nur ', 'Dwi ', 'Putra ', 'Siti ', 'Aulia ', 'Eka ', 'Tri '];

  const STUDENTS = [];
  KELAS.forEach((kelas) => {
    const used = new Set();
    while (used.size < 12) {
      const nama = pick(FIRST) + ' ' + pick(MID) + pick(LAST);
      if (used.has(nama)) continue;
      used.add(nama);
      STUDENTS.push({ nama, kelas });
    }
  });
  // global dipakai app.js (menggantikan roster asli sekolah)
  window.__DEMO_STUDENTS = STUDENTS;

  // ---------- Seed data ----------
  let _id = 1000;
  const DB = { piket_resimen: [], pelanggaran_kegiatan: [], jadwal_piket: [], absensi_piket: [] };

  // siswa "langganan" supaya panel Siswa Perhatian terlihat hidup
  const frequent = [];
  for (let i = 0; i < 8; i++) frequent.push(pick(STUDENTS));
  const pool = STUDENTS.concat(frequent, frequent, frequent, frequent.slice(0, 4), frequent.slice(0, 4));

  const T_DETAIL = ['Terlambat 5 menit', 'Terlambat 10 menit', 'Terlambat 15 menit', 'Terlambat 20 menit', 'Bangun kesiangan', 'Macet di jalan', 'Ban motor bocor', ''];
  const AT_DETAIL = ['Tidak memakai dasi', 'Tidak memakai ikat pinggang', 'Sepatu tidak sesuai ketentuan', 'Tidak memakai topi', 'Kaos kaki tidak sesuai', 'Atribut OSIS tidak lengkap', ''];

  for (let d = 0; d < 30; d++) {
    if (d > 0 && !isWeekday(d)) continue;
    const count = d === 0 ? 11 : 5 + Math.floor(rnd() * 10);
    const seen = new Set();
    let guard = 0;
    while (seen.size < count && guard++ < 200) {
      const s = pick(pool);
      const key = s.nama + '|' + s.kelas;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = rnd();
      const pel = r < 0.5 ? 'T' : r < 0.85 ? 'AT' : 'T+AT';
      let detail = '';
      if (pel === 'T') detail = pick(T_DETAIL);
      else if (pel === 'AT') detail = pick(AT_DETAIL);
      else detail = pick(T_DETAIL.slice(0, 4)) + ', ' + pick(AT_DETAIL.slice(0, 5)).toLowerCase();
      DB.piket_resimen.push({
        id: ++_id, nama: s.nama, kelas: s.kelas, pelanggaran: pel, detail,
        waktu_input: isoAt(d, 6 * 60 + Math.floor(rnd() * 100))
      });
    }
  }

  const KG = ['tidak_lengkap', 'telat_turun', 'makeup', 'tanpa_ciput', 'tanpa_legging', 'rambut_panjang', 'atribut_tidak_sesuai'];
  for (let d = 0; d < 30; d++) {
    if (d > 0 && !isWeekday(d)) continue;
    const count = d === 0 ? 4 : 1 + Math.floor(rnd() * 5);
    for (let i = 0; i < count; i++) {
      const s = pick(STUDENTS);
      const n = 1 + Math.floor(rnd() * 3);
      const codes = [];
      while (codes.length < n) { const c = pick(KG); if (!codes.includes(c)) codes.push(c); }
      DB.pelanggaran_kegiatan.push({
        id: ++_id, nama: s.nama, kelas: s.kelas, pelanggaran: codes, detail: '',
        waktu_input: isoAt(d, 7 * 60 + Math.floor(rnd() * 360))
      });
    }
  }

  // Jadwal petugas (nama fiktif, diambil dari roster kelas XI/XII)
  const petugasPool = STUDENTS.filter((s) => s.kelas.startsWith('XI'));
  const takeNames = (n) => { const out = []; while (out.length < n) { const x = pick(petugasPool).nama; if (!out.includes(x)) out.push(x); } return out; };
  ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].forEach((hari) => {
    const [pj, ...rest] = takeNames(6);
    DB.jadwal_piket.push({ hari, pj, kegiatan: rest.slice(0, 2), gerbang: rest.slice(2, 5) });
  });
  const todayHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
  const jToday = DB.jadwal_piket.find((j) => j.hari === todayHari);
  if (jToday) DB.absensi_piket.push({ id: ++_id, tanggal: wibToday(), nama: jToday.pj, status: 'hadir', waktu: new Date().toISOString() });

  // ---------- Query builder meniru Supabase SDK ----------
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T/;
  function cmpVal(a, b) {
    if (typeof a === 'string' && typeof b === 'string' && ISO_RE.test(a) && ISO_RE.test(b)) return Date.parse(a) - Date.parse(b);
    if (typeof a === 'number' && typeof b !== 'number') b = Number(b);
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  function matches(row, [col, op, val]) {
    const v = row[col];
    switch (op) {
      case 'eq': return String(v) === String(val);
      case 'neq': return String(v) !== String(val);
      case 'gt': return cmpVal(v, val) > 0;
      case 'gte': return cmpVal(v, val) >= 0;
      case 'lt': return cmpVal(v, val) < 0;
      case 'lte': return cmpVal(v, val) <= 0;
      case 'in': return val.map(String).includes(String(v));
      case 'ilike': return String(v || '').toLowerCase().includes(String(val).replace(/%/g, '').toLowerCase());
      default: return true;
    }
  }
  function runQuery(st) {
    let rows = (DB[st.table] || []).filter((r) => st.filters.every((f) => matches(r, f)));
    if (st.order) {
      const [col, asc] = st.order;
      rows = rows.slice().sort((a, b) => (asc ? 1 : -1) * cmpVal(a[col], b[col]));
    }
    if (st.limit != null) rows = rows.slice(0, st.limit);
    let out = JSON.parse(JSON.stringify(rows));
    if (st.cols && st.cols !== '*') {
      const cols = st.cols.split(',').map((c) => c.trim()).filter(Boolean);
      out = out.map((r) => { const o = {}; cols.forEach((c) => { o[c] = r[c]; }); return o; });
    }
    if (st.single) return { data: out[0] || null, error: null };
    return { data: out, error: null };
  }
  function makeQuery(table) {
    const st = { table, filters: [], order: null, limit: null, cols: '*', single: false };
    const q = {
      select(c) { st.cols = c || '*'; return q; },
      eq(c, v) { st.filters.push([c, 'eq', v]); return q; },
      neq(c, v) { st.filters.push([c, 'neq', v]); return q; },
      gt(c, v) { st.filters.push([c, 'gt', v]); return q; },
      gte(c, v) { st.filters.push([c, 'gte', v]); return q; },
      lt(c, v) { st.filters.push([c, 'lt', v]); return q; },
      lte(c, v) { st.filters.push([c, 'lte', v]); return q; },
      in(c, v) { st.filters.push([c, 'in', v]); return q; },
      ilike(c, v) { st.filters.push([c, 'ilike', v]); return q; },
      order(c, o) { st.order = [c, !(o && o.ascending === false)]; return q; },
      limit(n) { st.limit = n; return q; },
      single() { st.single = true; return q; },
      maybeSingle() { st.single = true; return q; },
      then(res, rej) { return Promise.resolve(runQuery(st)).then(res, rej); }
    };
    return q;
  }

  // Menggantikan window.supabase (SDK) yang dipakai initSupabase()
  window.supabase = {
    createClient() {
      return { from: (table) => makeQuery(table) };
    }
  };

  // ---------- Fake endpoint (fetch) ----------
  function json(body, status) {
    return new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  }
  function b64url(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function normName(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  function handleWrite(body) {
    const { table, action, data, filter } = body || {};
    const now = new Date().toISOString();
    const id = filter && filter.id;

    if (table === 'piket_resimen') {
      if (action === 'insert') {
        const { start, end } = { start: isoAt(0, 0), end: isoAt(0, 24 * 60 - 1) };
        const dup = DB.piket_resimen.some((r) => r.kelas === data.kelas && cmpVal(r.waktu_input, start) >= 0 && cmpVal(r.waktu_input, end) <= 0 && normName(r.nama) === normName(data.nama));
        if (dup) return json({ ok: false, error: data.nama + ' dari ' + data.kelas + ' sudah tercatat hari ini' }, 409);
        DB.piket_resimen.push({ id: ++_id, nama: data.nama, kelas: data.kelas, pelanggaran: data.pelanggaran, detail: data.detail || '', waktu_input: now });
        return json({ ok: true });
      }
      if (action === 'update') {
        const r = DB.piket_resimen.find((x) => String(x.id) === String(id));
        if (r) Object.assign(r, data);
        return json({ ok: true });
      }
      if (action === 'delete') {
        DB.piket_resimen = DB.piket_resimen.filter((x) => String(x.id) !== String(id));
        return json({ ok: true });
      }
    }

    if (table === 'pelanggaran_kegiatan') {
      if (action === 'insert') {
        DB.pelanggaran_kegiatan.push({ id: ++_id, nama: data.nama, kelas: data.kelas, pelanggaran: data.pelanggaran, detail: data.detail || '', waktu_input: now });
        return json({ ok: true });
      }
      if (action === 'update') {
        const r = DB.pelanggaran_kegiatan.find((x) => String(x.id) === String(id));
        if (r) Object.assign(r, data);
        return json({ ok: true });
      }
      if (action === 'delete') {
        DB.pelanggaran_kegiatan = DB.pelanggaran_kegiatan.filter((x) => String(x.id) !== String(id));
        return json({ ok: true });
      }
    }

    if (table === 'absensi_piket') {
      const tanggal = wibToday();
      const ex = DB.absensi_piket.find((x) => x.tanggal === tanggal && x.nama === data.nama);
      if (ex) { ex.status = data.status; ex.waktu = now; }
      else DB.absensi_piket.push({ id: ++_id, tanggal, nama: data.nama, status: data.status, waktu: now });
      return json({ ok: true });
    }

    if (table === 'jadwal_piket') {
      if (action === 'jadwal_save' || action === 'upsert') {
        (Array.isArray(data) ? data : [data]).forEach((row) => {
          const ex = DB.jadwal_piket.find((j) => j.hari === row.hari);
          const val = { hari: row.hari, pj: row.pj || '', kegiatan: row.kegiatan || [], gerbang: row.gerbang || [] };
          if (ex) Object.assign(ex, val); else DB.jadwal_piket.push(val);
        });
        return json({ ok: true });
      }
      if (action === 'delete') {
        DB.jadwal_piket = [];
        return json({ ok: true });
      }
    }
    return json({ ok: false, error: 'Aksi atau tabel tidak dikenali' }, 400);
  }

  // GET PostgREST (dipakai supaFetch): <base>/rest/v1/<table>?col=op.val&order=col.desc
  function handleRest(urlStr) {
    const u = new URL(urlStr);
    const table = u.pathname.split('/rest/v1/')[1];
    const st = { table, filters: [], order: null, limit: null, cols: u.searchParams.get('select') || '*', single: false };
    u.searchParams.forEach((val, key) => {
      if (key === 'select') return;
      if (key === 'limit') { st.limit = Number(val); return; }
      if (key === 'order') { const [c, dir] = val.split('.'); st.order = [c, dir !== 'desc']; return; }
      const dot = val.indexOf('.');
      if (dot > 0) st.filters.push([key, val.slice(0, dot), val.slice(dot + 1)]);
    });
    return json(runQuery(st).data);
  }

  const realFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : function () { return Promise.reject(new Error('fetch tidak tersedia')); };
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    let path = url;
    try { path = new URL(url, location.href).pathname; } catch (e) { /* abaikan */ }
    const body = (() => { try { return init && init.body ? JSON.parse(init.body) : {}; } catch (e) { return {}; } })();

    if (url.indexOf('https://demo.invalid/rest/v1/') === 0) return Promise.resolve(handleRest(url));
    if (/\/api\/login$/.test(path)) {
      const role = body.role || 'petugas';
      const iat = Math.floor(Date.now() / 1000);
      const token = b64url(JSON.stringify({ role, iat, exp: iat + 12 * 3600 })) + '.demo';
      return Promise.resolve(json({ ok: true, token }));
    }
    if (/\/api\/write$/.test(path)) return Promise.resolve(handleWrite(body));
    if (/\/api\/parse-jadwal$/.test(path)) {
      return Promise.resolve(json({ ok: false, error: 'Fitur baca jadwal dari gambar dinonaktifkan di web demo' }, 503));
    }
    return realFetch(input, init);
  };

  // Pasang token login demo di sessionStorage hanya lewat alur login normal (tidak di-bypass)
})();
