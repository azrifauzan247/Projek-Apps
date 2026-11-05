# AJK COMMAND CENTER 2026

Sistem pengurusan jawatankuasa & susulan tugasan untuk **Hari Anugerah Kecemerlangan dan Apresiasi Ashabul Yamin 2026** (28 November 2026, SM Tahfiz Darul Ridzuan Tambun). Antara muka dalam Bahasa Melayu.

## Menjalankan
```bash
npm install
cp .env.example .env.local      # pilihan
npm run build && npm start      # http://localhost:3000
```
Kali pertama dijalankan, pangkalan data dicipta di `data/ajk.db` dengan 13 unit / 31 AJK mengikut struktur rasmi, serta akaun **`admin`**.
Kata laluan admin = `ADMIN_PASSWORD` (jika diset), jika tidak satu kata laluan rawak dicetak di log pelayan. Tukar di **Tetapan**.

## Docker
```bash
echo "ADMIN_PASSWORD=KataLaluanAnda123" > .env
docker compose up -d --build     # buka http://<IP-pelayan>:3000
```
Data disimpan dalam volume `ajk-data` (sandarkan volume ini). Jika diakses melalui HTTPS, tambah `COOKIE_SECURE=true` dalam `.env`.

### HTTPS dengan domain (Caddy)
1. Arahkan rekod DNS **A** domain anda (cth. `ajk.namaanda.com`) ke IP pelayan.
2. Buka port 80 dan 443 di firewall.
3. Dalam `.env` tambah `DOMAIN=ajk.namaanda.com`, kemudian:
```bash
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```
Sijil HTTPS diperoleh dan diperbaharui secara automatik. Buka `https://ajk.namaanda.com`.

## Modul
Dashboard · Direktori AJK · Pengurusan Tugasan (lampiran, sejarah kemajuan) · Pusat Susulan (senarai, sejarah, peringatan, WhatsApp) · Prestasi Unit · Senarai Semak Majlis · Laporan (PDF/Excel + sejarah) · Tetapan (program, templat WhatsApp, akaun).

## Peranan
| Peranan | Akses |
|---|---|
| Pengarah / Admin | Penuh |
| Ketua Unit | Tugasan, susulan & senarai semak unit sendiri sahaja |
| Ahli AJK | Kemas kini status/kemajuan/nota/lampiran tugasan sendiri |

Cipta akaun ahli/ketua di **Tetapan → Akaun Pengguna**. Kebenaran dikuatkuasakan di pelayan.

## Nota penting
- Hanya no. telefon Pengarah (Ustaz Azri) diisi; no. AJK lain dibiarkan kosong — tambah di Direktori jika perlu.
- Tarikh akhir tugasan permulaan ialah jadual **cadangan** (bekerja ke belakang dari 28 Nov 2026). Laraskan di Pengurusan Tugasan.
- **Tugasan permulaan (24) ialah draf** berdasarkan fungsi unit, kerana teks deskripsi tugas rasmi kertas cadangan tidak dibekalkan. Ditanda "Draf" — semak/gantikan.
- Item senarai semak majlis (14 kategori) juga boleh disunting.
- **WhatsApp** menggunakan pautan `wa.me` — **tiada API key diperlukan**. Mesej dibuka dalam WhatsApp dan Pengarah menekan hantar sendiri. (WhatsApp Business API automatik memerlukan akaun Meta Business + token.)
- **Pangkalan data**: SQLite (fail tempatan, tiada kunci API). Ia memerlukan pelayan dengan cakera tetap (VPS / Docker volume / Railway / Fly) — **bukan** Vercel/serverless. Sandarkan folder `data/` (pangkalan data + lampiran). Skema SQL mudah dipindahkan ke Supabase/PostgreSQL; itu memerlukan `SUPABASE_URL` + kunci projek anda dan penggantian `src/lib/db.ts`.
- Set `COOKIE_SECURE=true` jika dihoskan di HTTPS.

## Ujian
`DATA_DIR=/tmp/x ADMIN_PASSWORD=Testpass123 npx next start -p 3100` kemudian `npm test` (69 semakan API: pengesahan, CRUD, kebenaran peranan, peraturan status, lampiran, laporan).
