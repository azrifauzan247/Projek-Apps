# AJK COMMAND CENTER 2026

Sistem pantau jawatankuasa & susulan tugasan untuk **Hari Anugerah Kecemerlangan dan Apresiasi Ashabul Yamin 2026** (28 Nov 2026).
Laman web biasa (boleh dibuka di telefon), **tiada login**, **percuma**. Data dikongsi oleh semua AJK melalui pangkalan data Supabase percuma.

## Persediaan (sekali sahaja, ±10 minit)

### A. Pangkalan data (Supabase, percuma)
1. Daftar di https://supabase.com → **New project**.
2. **SQL Editor → New query** → tampal kandungan [`supabase/setup.sql`](supabase/setup.sql) → **Run**.
3. **Project Settings → API**: salin *Project URL* dan kunci *anon public*.

### B. Hoskan laman (GitHub Pages, percuma)
1. Merge PR ke `main`.
2. Di GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Tunggu tab **Actions** siap. Alamat: `https://<nama-github>.github.io/Projek-Apps/`

### C. Sambung
1. Buka alamat laman di telefon. Tampal *Project URL* dan kunci → **Sambung & Mula**.
2. Pergi ke **Tetapan → Pautan untuk AJK** → **Salin**, hantar melalui WhatsApp. AJK hanya perlu tekan pautan itu.

Kali pertama, 13 unit, 31 AJK, 24 tugasan draf dan senarai semak disemai automatik.

## Keselamatan (penting)
Tiada login: **sesiapa yang ada pautan boleh melihat dan mengubah data**. Hantar pautan kepada AJK sahaja. Jika pautan bocor, jana semula kunci di Supabase (*Settings → API*) dan hantar pautan baharu. Sandaran: **Tetapan → Muat turun sandaran**.

## Modul
Dashboard · Direktori AJK · Pengurusan Tugasan (lampiran, sejarah kemajuan) · Pusat Susulan (WhatsApp melalui pautan `wa.me`, tiada API key) · Prestasi Unit · Senarai Semak Majlis · Laporan (PDF/Excel + sejarah) · Tetapan.
Pilih nama anda pada kali pertama supaya kemas kini direkodkan atas nama anda (bukan kata laluan).

## Nota
- Hanya no. telefon Pengarah diisi; tambah no. AJK lain di Direktori untuk guna butang WhatsApp.
- 24 tugasan permulaan ialah **draf** dengan tarikh akhir **cadangan** (kertas cadangan rasmi tidak dibekalkan). Semak dan laraskan.
- Pelan percuma Supabase menghentikan projek yang tidak aktif 7 hari; buka app sekali seminggu atau klik *Restore* jika berhenti.

## Pembangunan
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # hasil statik dalam out/
npm test             # ujian logik terhadap Postgres (PGURL=postgres://... )
```

## Halaman RSVP (jemputan awam)

Halaman jemputan bergaya kad kahwin dengan tema laut, muzik latar, gelembung dan ikan bergerak. Terletak di `public/JemputanHariAnugerahAkramin2026/` (alamat untuk ibu bapa: `<laman>/JemputanHariAnugerahAkramin2026/`; `/rsvp/` dialihkan ke sini). Halaman admin di `/rsvp/admin/`. Tiada pergantungan; semua dalam satu fail.

- **Pengesahan kehadiran:** jalankan `supabase/rsvp.sql` sekali. Pengunjung hanya boleh *menambah* rekod; data dilihat di SQL Editor. Pautan yang diberi kepada ibu bapa membawa konfigurasi Supabase di `#k=` (sama seperti app AJK).
- **Surat jemputan mengikut nama pelajar (cara disyorkan, tanpa kod):** jalankan `supabase/surat.sql` sekali (tukar `GANTI-KATA-LALUAN` dahulu). Kemudian buka `<laman>/rsvp/admin/`, masukkan kata laluan, dan muat naik PDF. **Nama fail = nama penuh pelajar** (cth `AHMAD BIN ABDULLAH.pdf`). Ibu bapa taip nama pelajar di halaman RSVP dan terus memuat turun. Jadual surat tidak boleh dibaca terus; akses hanya melalui fungsi yang dilindungi (muat naik, senarai dan padam memerlukan kata laluan admin; muat turun memerlukan cincang nama yang betul).
- **Sandaran tanpa pangkalan data:** `python3 scripts/rsvp-surat.py <folder-pdf>` menyalin PDF ke `public/JemputanHariAnugerahAkramin2026/surat/` dengan nama rawak dan menulis `index.json` (cincang nama sahaja).

**Pautan bersih tanpa `#k=`:** tambah dua pembolehubah repo di GitHub (Settings, Secrets and variables, Actions, tab Variables): `SUPABASE_URL` (alamat asas, tanpa `/rest/v1/`) dan `SUPABASE_ANON_KEY`. Semasa deploy, workflow menulis `config.js` (kunci anon memang awam; keselamatan dijaga oleh RLS dan fungsi berkata laluan). Tiada kunci disimpan dalam git. Tanpa pembolehubah ini, guna pautan dengan `#k=...`.

**Bukti pembayaran RM30:** jalankan `supabase/bukti.sql` sekali (selepas `surat.sql`). Ibu bapa memuat naik resit (gambar atau PDF) di bahagian pembayaran halaman jemputan; gambar dikecilkan di pelayar sebelum dihantar. Admin melihat dan memadam bukti di `/rsvp/admin/`. Jadual tidak boleh dibaca terus; had: 5 bukti setiap nama dan 3000 keseluruhan.
