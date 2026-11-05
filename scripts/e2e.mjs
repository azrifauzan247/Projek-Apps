// Ujian hhujung-ke-hujung API. Guna: DATA_DIR=/tmp/x ADMIN_PASSWORD=Testpass123 npm start & node scripts/e2e.mjs
const BASE = process.env.BASE || "http://localhost:3100";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("  GAGAL:", m); } };

class Client {
  cookie = "";
  async req(method, url, body) {
    const isForm = body instanceof FormData;
    const r = await fetch(BASE + url, { method, headers: { ...(isForm || body === undefined ? {} : { "Content-Type": "application/json" }), cookie: this.cookie }, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
    const sc = r.headers.get("set-cookie"); if (sc) this.cookie = sc.split(";")[0];
    const ct = r.headers.get("content-type") || "";
    return { status: r.status, body: ct.includes("json") ? await r.json() : await r.text() };
  }
  login(u, p) { return this.req("POST", "/api/auth/login", { username: u, password: p }); }
}
const admin = new Client();

console.log("# Auth");
ok((await new Client().req("GET", "/api/data")).status === 401, "data tanpa login = 401");
ok((await admin.login("admin", "salah")).status === 401, "login salah = 401");
ok((await admin.login("admin", process.env.ADMIN_PASSWORD || "Testpass123")).status === 200, "login admin");
let D = (await admin.req("GET", "/api/data")).body;
ok(D.me.role === "admin" && D.units.length === 13, "13 unit dimuat");
ok(D.members.length === 31, `31 ahli (dapat ${D.members.length})`);
ok(D.members.every((m) => m.phone === ""), "tiada no. telefon direka");
ok(D.tasks.every((t) => t.deadline === null), "tiada tarikh akhir direka");
ok(D.checklist.length >= 14, "senarai semak diseed");
ok(!JSON.stringify(D).includes("auth_secret"), "auth_secret tidak bocor");

console.log("# Unit & ahli");
let r = await admin.req("POST", "/api/r/units", { name: "Unit Ujian" }); ok(r.status === 200, "cipta unit");
const uid = r.body.id;
ok((await admin.req("POST", "/api/r/units", { name: "Unit Ujian" })).status === 409, "nama unit pendua = 409");
ok((await admin.req("POST", "/api/r/units", { name: "  " })).status === 400, "nama unit kosong = 400");
r = await admin.req("POST", "/api/r/members", { name: "Ustaz Ujian", unit_id: uid, position: "Ketua", phone: "012-3456789" }); ok(r.status === 200, "cipta ahli");
const mid = r.body.id;
ok((await admin.req("POST", "/api/r/members", { name: "X", phone: "abc" })).status === 400, "telefon tidak sah ditolak");
ok((await admin.req("PATCH", `/api/r/members/${mid}`, { name: "Ustaz Ujian 2", unit_id: uid, position: "Ahli", phone: "", extra_resp: "Bendahari" })).status === 200, "sunting ahli");
ok((await admin.req("DELETE", `/api/r/units/${uid}`)).status === 409, "padam unit berahli ditolak");

console.log("# Tugasan");
r = await admin.req("POST", "/api/r/tasks", { title: "Tugasan Ujian", unit_id: uid, member_id: mid, priority: "High", start_date: "2026-11-10", deadline: "2026-11-01" });
ok(r.status === 400, "deadline sebelum mula ditolak");
r = await admin.req("POST", "/api/r/tasks", { title: "Tugasan Ujian", unit_id: uid, member_id: mid, priority: "High", start_date: "2026-01-01", deadline: "2026-01-05" });
ok(r.status === 200, "cipta tugasan"); const tid = r.body.id;
ok((await admin.req("POST", "/api/r/tasks", { title: "T", unit_id: D.units[0].id, member_id: mid })).status === 400, "ahli bukan dalam unit ditolak");
ok((await admin.req("POST", "/api/r/tasks", { title: "T", priority: "Urgent" })).status === 400, "keutamaan tidak sah");
const get = async () => (await admin.req("GET", "/api/data")).body.tasks.find((t) => t.id === tid);
let t = await get(); const base = { ...t };
await admin.req("PATCH", `/api/r/tasks/${tid}`, { ...base, progress: 40 }); t = await get(); ok(t.status === "ongoing" && t.progress === 40, "progress>0 => ongoing");
await admin.req("PATCH", `/api/r/tasks/${tid}`, { ...t, progress: 100 }); t = await get(); ok(t.status === "done" && t.completed_at, "progress 100 => done");
await admin.req("PATCH", `/api/r/tasks/${tid}`, { ...t, status: "pending" }); t = await get(); ok(t.status === "pending" && t.progress === 0 && !t.completed_at, "pending reset");
await admin.req("PATCH", `/api/r/tasks/${tid}`, { ...t, status: "done" }); t = await get(); ok(t.progress === 100, "done => 100%");
ok((await admin.req("GET", "/api/data")).body.taskLog.filter((l) => l.task_id === tid).length >= 4, "log kemajuan direkod");

console.log("# Lampiran");
const fd = new FormData(); fd.append("file", new Blob(["hello"], { type: "text/plain" }), "nota.txt");
r = await admin.req("POST", `/api/tasks/${tid}/attachments`, fd); ok(r.status === 200, "muat naik lampiran");
D = (await admin.req("GET", "/api/data")).body; const att = D.attachments.find((a) => a.task_id === tid); ok(!!att, "lampiran tersenarai");
r = await admin.req("GET", `/api/attachments/${att.id}`); ok(r.status === 200 && r.body === "hello", "muat turun lampiran");
const big = new FormData(); big.append("file", new Blob([new Uint8Array(11 * 1024 * 1024)]), "besar.bin");
ok((await admin.req("POST", `/api/tasks/${tid}/attachments`, big)).status === 413, "fail >10MB ditolak");

console.log("# Susulan");
r = await admin.req("POST", "/api/r/followups", { member_id: mid, task_id: tid, contacted_at: "2026-11-05T10:00", method: "WhatsApp", summary: "Tanya status", responded: 0, next_followup: "2026-11-08" }); ok(r.status === 200, "rekod susulan");
const fid = r.body.id;
ok((await admin.req("POST", "/api/r/followups", { member_id: mid, contacted_at: "2026-11-05T10:00", method: "Telepati" })).status === 400, "kaedah tidak sah");
ok((await admin.req("PATCH", `/api/r/followups/${fid}`, { member_id: mid, task_id: tid, contacted_at: "2026-11-05T10:00", method: "Panggilan", summary: "Tanya", responded: 1, response: "Siap 50%", next_followup: null })).status === 200, "sunting susulan");
D = (await admin.req("GET", "/api/data")).body; ok(D.followups.find((f) => f.id === fid)?.response === "Siap 50%", "susulan dikemas kini");

console.log("# Senarai semak");
const c0 = D.checklist[0];
ok((await admin.req("PATCH", `/api/r/checklist/${c0.id}`, { done: true })).status === 200, "tanda item");
D = (await admin.req("GET", "/api/data")).body; ok(D.checklist.find((c) => c.id === c0.id).done === 1, "item ditanda & kekal");
r = await admin.req("POST", "/api/r/checklist", { category: "Ujian", title: "Item ujian" }); ok(r.status === 200, "tambah item");
ok((await admin.req("DELETE", `/api/r/checklist/${r.body.id}`)).status === 200, "padam item");

console.log("# Peranan");
ok((await admin.req("POST", "/api/r/users", { username: "ketua1", password: "abcd1234", role: "leader", member_id: mid })).status === 200, "cipta akaun ketua");
const m2 = (await admin.req("POST", "/api/r/members", { name: "Ahli Dua", unit_id: uid, position: "Ahli" })).body.id;
const t2 = (await admin.req("POST", "/api/r/tasks", { title: "Tugas Ahli Dua", unit_id: uid, member_id: m2 })).body.id;
ok((await admin.req("POST", "/api/r/users", { username: "ahli2", password: "abcd1234", role: "member", member_id: m2 })).status === 200, "cipta akaun ahli");
ok((await admin.req("POST", "/api/r/users", { username: "ahli2", password: "abcd1234", role: "member", member_id: m2 })).status === 409, "nama pengguna pendua");
ok((await admin.req("POST", "/api/r/users", { username: "pendek", password: "123", role: "member", member_id: m2 })).status === 400, "kata laluan pendek");
const lead = new Client(); await lead.login("ketua1", "abcd1234");
let L = (await lead.req("GET", "/api/data")).body;
ok(L.units.length === 1 && L.tasks.every((x) => x.unit_id === uid), "ketua hanya nampak unit sendiri");
ok(L.users.length === 0, "ketua tidak nampak senarai pengguna");
ok((await lead.req("POST", "/api/r/members", { name: "Z" })).status === 403, "ketua tidak boleh tambah ahli");
ok((await lead.req("PATCH", `/api/r/tasks/${D.tasks[0].id}`, { ...D.tasks[0] })).status === 403, "ketua tidak boleh sunting tugasan unit lain");
ok((await lead.req("POST", "/api/r/tasks", { title: "Dari ketua", unit_id: D.units[0].id })).status === 200, "ketua cipta tugasan (dipaksa ke unit sendiri)");
L = (await lead.req("GET", "/api/data")).body; ok(L.tasks.some((x) => x.title === "Dari ketua" && x.unit_id === uid), "unit dipaksa ke unit ketua");
ok((await lead.req("PATCH", "/api/settings", {})).status === 403, "ketua tidak boleh ubah tetapan");
const mem = new Client(); await mem.login("ahli2", "abcd1234");
let M = (await mem.req("GET", "/api/data")).body;
ok(M.tasks.length === 1 && M.tasks[0].id === t2, "ahli hanya nampak tugasan sendiri");
ok(M.followups.length === 0 && M.users.length === 0, "ahli tidak nampak susulan/pengguna");
ok((await mem.req("PATCH", `/api/r/tasks/${t2}`, { status: "ongoing", progress: 30, notes: "mula", title: "DIUBAH" })).status === 200, "ahli kemas kini kemajuan");
M = (await mem.req("GET", "/api/data")).body; ok(M.tasks[0].title === "Tugas Ahli Dua" && M.tasks[0].progress === 30, "ahli tidak boleh ubah tajuk");
ok((await mem.req("PATCH", `/api/r/tasks/${tid}`, { status: "done", progress: 100, notes: "" })).status === 403, "ahli tidak boleh kemas kini tugasan orang lain");
ok((await mem.req("DELETE", `/api/r/tasks/${t2}`)).status === 403, "ahli tidak boleh padam");
ok((await mem.req("GET", `/api/attachments/${att.id}`)).status === 403, "ahli tidak boleh muat turun lampiran orang lain");
ok((await mem.req("PATCH", `/api/r/checklist/${c0.id}`, { done: false })).status === 403, "ahli tidak boleh tanda senarai semak");

console.log("# Laporan & tetapan");
r = await admin.req("POST", "/api/r/reports", { type: "keseluruhan", title: "Ujian", payload: { a: 1 } }); ok(r.status === 200, "simpan laporan");
r = await admin.req("GET", `/api/reports/${r.body.id}`); ok(r.status === 200 && r.body.payload.a === 1, "baca laporan tersimpan");
ok((await admin.req("PATCH", "/api/settings", { event_name: "X", event_date: "bukan-tarikh", venue: "", director: "", stale_days: 7, soon_days: 3, wa_template: "Assalamualaikum {nama}" })).status === 400, "tetapan tidak sah ditolak");
const S = D.settings;
ok((await admin.req("PATCH", "/api/settings", { ...S, stale_days: 5 })).status === 200, "tetapan disimpan");
ok((await admin.req("GET", "/api/data")).body.settings.stale_days === "5", "tetapan kekal");
ok((await admin.req("POST", "/api/auth/password", { current: "salah", next: "baharu1234" })).status === 400, "tukar kata laluan: semasa salah");

console.log("# Pemadaman");
ok((await admin.req("DELETE", `/api/r/members/${mid}`)).status === 200, "padam ahli");
D = (await admin.req("GET", "/api/data")).body; ok(D.tasks.find((x) => x.id === tid).member_id === null, "tugasan menjadi tidak ditugaskan");
ok((await admin.req("DELETE", `/api/r/tasks/${tid}`)).status === 200, "padam tugasan");
D = (await admin.req("GET", "/api/data")).body; ok(!D.attachments.some((a) => a.task_id === tid) && !D.tasks.some((x) => x.id === tid), "lampiran & log turut dipadam");
ok((await admin.req("DELETE", `/api/r/members/${D.users.find((u) => u.role === "admin").member_id}`)).status === 409, "ahli admin tidak boleh dipadam");
ok((await admin.req("DELETE", `/api/r/users/${D.me.id}`)).status === 409, "tidak boleh padam akaun sendiri");
ok((await admin.req("POST", "/api/auth/logout")).status === 200, "logout");

console.log(`\nLulus: ${pass}  Gagal: ${fail}`);
process.exit(fail ? 1 : 0);
