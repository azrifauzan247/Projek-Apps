export interface SeedMember { name: string; position: string; extra?: string; phone?: string }
export interface SeedUnit { name: string; description?: string; members: SeedMember[] }

const K = "Ketua";
export const SEED_UNITS: SeedUnit[] = [
  { name: "Penasihat", members: [{ name: "Ustaz Azizuddin", position: "Penasihat" }, { name: "Ustazah Maisarah", position: "Penasihat" }] },
  { name: "Pengarah (Bendahari & Protokol)", description: "Pengarah program, bendahari dan protokol", members: [
    { name: "Ustaz Azri", position: "Pengarah", extra: "Bendahari & Protokol", phone: "01121030274" },
    { name: "Teacher Revol", position: "Timbalan Pengarah" } ] },
  { name: "Setiausaha (Perhubungan Luar)", members: [{ name: "Ustazah Huda", position: K }, { name: "Ustaz Ikmal", position: "Ahli" }] },
  { name: "Keceriaan & Persiapan Pelajar", members: [{ name: "Ustazah Atiqah", position: K }, { name: "Teacher Hanin", position: "Ahli" }, { name: "Teacher Dina", position: "Ahli" }] },
  { name: "Teknikal", members: [{ name: "Ustaz Anam", position: K }, { name: "Teacher Akma", position: "Ahli" }] },
  { name: "Pendaftaran & Booth", members: [{ name: "Teacher Aqilah", position: K }, { name: "Ustazah Sarah", position: "Ahli" }] },
  { name: "Multimedia", members: [{ name: "Ustaz Hafiz", position: K }, { name: "Teacher Aina", position: "Ahli" }] },
  { name: "Pengacara Majlis", members: [{ name: "Ustaz Nuzul", position: K }, { name: "Teacher Afifah", position: "Ahli" }] },
  { name: "Hadiah & Cenderahati", members: [{ name: "Teacher Afrah", position: K }, { name: "Teacher Atiqah", position: "Ahli" }, { name: "Ustaz Hamka", position: "Ahli" }, { name: "Ustaz Syafiq", position: "Ahli" }] },
  { name: "Atur Cara & Persembahan", members: [{ name: "Ustazah Afiqah", position: K }, { name: "Ustazah Anis", position: "Ahli" }, { name: "Teacher Nita", position: "Ahli" }, { name: "Teacher Batrisyia", position: "Ahli" }] },
  { name: "Persiapan Tempat", members: [{ name: "Ustaz Faez Fadzil", position: K }, { name: "Ustaz Hurairah", position: "Ahli" }] },
  { name: "Persegaran", members: [{ name: "Teacher Farra", position: K }, { name: "Teacher Syahirah", position: "Ahli" }] },
  { name: "Kebersihan & Tugas-Tugas Khas", members: [{ name: "Ustaz Hasnan", position: K }, { name: "Ustaz Faiz", position: "Ahli" }] },
];

type P = "Low" | "Medium" | "High" | "Critical";
const t = (unit: string, title: string, description: string, priority: P, deadline: string) => ({ unit, title, description, priority, deadline });

// Tugasan PERMULAAN (draf) berdasarkan fungsi setiap unit. Bukan teks rasmi kertas cadangan –
// Tarikh akhir ialah jadual CADANGAN bekerja ke belakang dari 28 Nov 2026 – laraskan mengikut keperluan.
export const SEED_TASKS = [
  t("Pengarah (Bendahari & Protokol)", "Sediakan bajet dan pantau perbelanjaan", "Sediakan bajet program, rekod kutipan dan perbelanjaan.", "High", "2026-11-14"),
  t("Pengarah (Bendahari & Protokol)", "Susunan protokol dan tetamu kehormat", "Sahkan senarai tetamu kehormat, tempat duduk dan aturan protokol.", "High", "2026-11-18"),
  t("Setiausaha (Perhubungan Luar)", "Surat jemputan dan perhubungan luar", "Sediakan dan hantar surat jemputan serta jejak pengesahan kehadiran.", "High", "2026-11-10"),
  t("Setiausaha (Perhubungan Luar)", "Minit mesyuarat dan rekod urusan", "Rekod minit mesyuarat dan simpan dokumen rasmi program.", "Medium", "2026-11-27"),
  t("Keceriaan & Persiapan Pelajar", "Hiasan dan keceriaan dewan", "Rancang dan sediakan hiasan serta keceriaan tempat program.", "Medium", "2026-11-26"),
  t("Keceriaan & Persiapan Pelajar", "Persiapan dan pengurusan pelajar", "Susun pelajar, tugasan pelajar dan kehadiran pada hari program.", "High", "2026-11-24"),
  t("Teknikal", "Ujian peralatan teknikal", "Persiapan dan pengujian peralatan teknikal.", "Critical", "2026-11-26"),
  t("Teknikal", "Sistem PA dan pencahayaan", "Sediakan dan uji sistem PA, mikrofon dan pencahayaan.", "Critical", "2026-11-26"),
  t("Pendaftaran & Booth", "Kaunter pendaftaran", "Sediakan kaunter pendaftaran, senarai hadir dan tag nama.", "High", "2026-11-25"),
  t("Pendaftaran & Booth", "Pengurusan booth", "Atur penempatan dan keperluan booth.", "Medium", "2026-11-24"),
  t("Multimedia", "Pembentangan multimedia dan video", "Sediakan slaid, video dan bahan paparan program.", "High", "2026-11-22"),
  t("Multimedia", "Dokumentasi foto dan video", "Atur liputan gambar dan video pada hari program.", "Medium", "2026-11-27"),
  t("Pengacara Majlis", "Skrip pengacara majlis", "Sediakan dan muktamadkan skrip pengacara.", "High", "2026-11-20"),
  t("Pengacara Majlis", "Latihan pengacara", "Jalankan latihan bersama atur cara dan teknikal.", "Medium", "2026-11-25"),
  t("Hadiah & Cenderahati", "Penyediaan hadiah dan anugerah", "Senarai, pembelian dan pembungkusan hadiah serta anugerah.", "High", "2026-11-18"),
  t("Hadiah & Cenderahati", "Sijil dan cenderahati", "Sediakan sijil dan cenderahati untuk penerima dan tetamu.", "High", "2026-11-20"),
  t("Atur Cara & Persembahan", "Muktamad atur cara majlis", "Sediakan dan sahkan atur cara majlis penuh.", "Critical", "2026-11-12"),
  t("Atur Cara & Persembahan", "Latihan persembahan", "Jadual dan jalankan latihan persembahan.", "High", "2026-11-24"),
  t("Persiapan Tempat", "Persiapan dewan dan pentas", "Susun dewan, pentas, kerusi dan meja.", "High", "2026-11-26"),
  t("Persiapan Tempat", "Susun atur tempat VIP", "Sediakan ruang dan tempat duduk VIP.", "Medium", "2026-11-25"),
  t("Persegaran", "Menu dan tempahan makanan", "Tentukan menu, kuantiti dan tempahan makanan serta minuman.", "High", "2026-11-15"),
  t("Persegaran", "Pengagihan makanan pada hari program", "Atur pengagihan makanan kepada tetamu, AJK dan pelajar.", "Medium", "2026-11-27"),
  t("Kebersihan & Tugas-Tugas Khas", "Kebersihan sebelum dan selepas program", "Atur pembersihan dewan, tandas dan kawasan sekitar.", "Medium", "2026-11-27"),
  t("Kebersihan & Tugas-Tugas Khas", "Tugas khas hari program", "Kenal pasti dan agihkan tugas-tugas khas.", "Medium", "2026-11-26"),
];

export const SEED_CHECKLIST: [string, string[]][] = [
  ["Persiapan tempat", ["Dewan dibersihkan dan disusun", "Kerusi dan meja disusun mengikut pelan"]],
  ["Hiasan pentas", ["Hiasan pentas dan backdrop siap dipasang", "Banner dan papan tanda dipasang"]],
  ["Ujian peralatan teknikal", ["Semua peralatan teknikal diuji", "Kabel dan sambungan dipastikan selamat"]],
  ["Sistem PA dan pencahayaan", ["Sistem PA dan mikrofon diuji", "Pencahayaan pentas diuji"]],
  ["Kaunter pendaftaran", ["Kaunter pendaftaran disediakan", "Senarai hadir dan tag nama sedia"]],
  ["Urusan VIP", ["Senarai VIP disahkan", "Tempat duduk dan sambutan VIP disediakan"]],
  ["Hadiah dan cenderahati", ["Semua hadiah dan cenderahati lengkap", "Hadiah disusun mengikut kategori"]],
  ["Makanan dan minuman", ["Tempahan makanan disahkan", "Pengagihan makanan dirancang"]],
  ["Latihan persembahan", ["Latihan persembahan dijalankan", "Latihan penuh bersama teknikal"]],
  ["Skrip pengacara", ["Skrip pengacara muktamad", "Skrip dihantar kepada pengacara"]],
  ["Sijil", ["Sijil dicetak dan disemak", "Sijil disusun mengikut penerima"]],
  ["Susunan pelajar", ["Senarai pelajar disahkan", "Tempat duduk dan giliran pelajar diatur"]],
  ["Persembahan multimedia", ["Slaid dan video muktamad", "Persembahan multimedia diuji di dewan"]],
  ["Kebersihan dan kemas kini", ["Pasukan kebersihan ditugaskan", "Pelan kemas kini selepas majlis"]],
];

export const DEFAULT_WA_TEMPLATE = `Assalamualaikum {nama}.

Saya nak follow-up sedikit berkenaan tugasan {unit} bagi {program}.

Boleh saya dapatkan perkembangan terkini berkaitan {tugasan}?{tarikh}

Mohon maklumkan status semasa dan sekiranya terdapat sebarang keperluan atau masalah yang perlu kita selesaikan bersama.

Terima kasih.`;

export const DEFAULT_SETTINGS: Record<string, string> = {
  event_name: "Hari Anugerah Kecemerlangan dan Apresiasi Ashabul Yamin 2026",
  event_date: "2026-11-28",
  venue: "Sekolah Menengah Tahfiz Darul Ridzuan Tambun",
  director: "Ahmad Azri Fauzan bin Zoolcaphly",
  stale_days: "7",
  soon_days: "3",
  wa_template: DEFAULT_WA_TEMPLATE,
};
