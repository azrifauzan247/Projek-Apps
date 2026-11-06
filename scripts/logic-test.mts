// Ujian logik app terhadap Postgres sebenar. Guna: PGURL=postgres://postgres@/postgres?host=/tmp&port=5544 npm test
import pg from "pg";
import { makePgClient } from "./pg-client.mts";
import { __setClient, dispatch, setWho } from "../src/lib/repo";
import { buildReport } from "../src/lib/reports";
import { followRows, stats, attention, watchUrgent, todayStr, addDays } from "../src/lib/logic";
import type { AppData } from "../src/lib/types";

(globalThis as any).localStorage = { _m: new Map<string, string>(), getItem(k: string) { return this._m.get(k) ?? null; }, setItem(k: string, v: string) { this._m.set(k, v); }, removeItem(k: string) { this._m.delete(k); } }; // eslint-disable-line
(globalThis as any).window = { location: { hash: "", origin: "http://x", pathname: "/" } }; // eslint-disable-line

let pass = 0, fail = 0;
const ok = (c: unknown, m: string) => { if (c) pass++; else { fail++; console.log("  GAGAL:", m); } };
const rejects = async (p: Promise<unknown>, re: RegExp, m: string) => { try { await p; ok(false, m + " (tiada ralat)"); } catch (e) { ok(re.test((e as Error).message), `${m} (dapat: ${(e as Error).message.slice(0, 80)})`); } };

const pool = new pg.Pool({ connectionString: process.env.PGURL || "postgres://postgres@/postgres?host=/tmp&port=5544" });
await pool.query("truncate units, members, tasks, task_log, attachments, followups, checklist, reports, settings restart identity cascade");
const client = makePgClient(pool);
__setClient(client as never);
const load = async () => (await dispatch("GET", "/api/data")) as AppData;

console.log("# Pantauan: jadual belum dibuat");
await pool.query("drop table if exists watch_items");
let W0 = await load(); ok(W0.watchReady === false && W0.watch.length === 0 && W0.units.length === 13, "app tetap berfungsi tanpa jadual pantauan");
const { readFileSync } = await import("node:fs");
await pool.query(readFileSync(new URL("../supabase/watch.sql", import.meta.url), "utf8"));
await pool.query(readFileSync(new URL("../supabase/watch.sql", import.meta.url), "utf8")); // boleh diulang
W0 = await load(); ok(W0.watchReady === true, "jadual pantauan sedia selepas SQL");

console.log("# Semaian kali pertama");
let D = await load();
ok(D.units.length === 13, `13 unit (dapat ${D.units.length})`);
ok(D.members.length === 31, `31 ahli (dapat ${D.members.length})`);
ok(D.members.filter((m) => m.phone).map((m) => m.name).join() === "Ustaz Azri" && D.members.find((m) => m.name === "Ustaz Azri")!.phone === "01121030274", "hanya no. Pengarah diisi");
ok(D.tasks.length === 24 && D.tasks.every((t) => t.deadline && t.deadline <= "2026-11-28" && t.is_draft === 1), "24 tugasan draf bertarikh akhir");
ok(D.checklist.length === 28, "senarai semak 28 item");
ok(D.settings.event_date === "2026-11-28" && !("seeded" in D.settings), "tetapan program");
ok(D.tasks.every((t) => D.members.find((m) => m.id === t.member_id)?.unit_id === t.unit_id), "setiap tugasan ditugaskan kepada ahli dalam unitnya");
const again = await load(); ok(again.units.length === 13 && again.tasks.length === 24, "muat semula tidak menyemai berganda");

console.log("# Unit & ahli");
const u = (await dispatch("POST", "/api/r/units", { name: "Unit Ujian" })) as { id: number };
await rejects(dispatch("POST", "/api/r/units", { name: "Unit Ujian" }), /sudah wujud/, "unit pendua");
await rejects(dispatch("POST", "/api/r/units", { name: "  " }), /diperlukan/, "nama unit kosong");
const m = (await dispatch("POST", "/api/r/members", { name: "Ustaz Ujian", unit_id: u.id, position: "Ketua", phone: "012-3456789" })) as { id: number };
await rejects(dispatch("POST", "/api/r/members", { name: "X", phone: "abc" }), /telefon/, "telefon tidak sah");
await dispatch("PATCH", `/api/r/members/${m.id}`, { name: "Ustaz Ujian 2", unit_id: u.id, position: "Ahli", phone: "", extra_resp: "Bendahari" });
D = await load(); ok(D.members.find((x) => x.id === m.id)?.name === "Ustaz Ujian 2" && D.members.find((x) => x.id === m.id)?.extra_resp === "Bendahari", "sunting ahli");
await rejects(dispatch("DELETE", `/api/r/units/${u.id}`), /masih mempunyai/, "padam unit berahli ditolak");

console.log("# Tugasan");
await rejects(dispatch("POST", "/api/r/tasks", { title: "T", unit_id: u.id, member_id: m.id, start_date: "2026-11-10", deadline: "2026-11-01" }), /Tarikh akhir/, "deadline sebelum mula");
await rejects(dispatch("POST", "/api/r/tasks", { title: "T", unit_id: D.units[0].id, member_id: m.id }), /bukan dalam unit/, "ahli bukan dalam unit");
await rejects(dispatch("POST", "/api/r/tasks", { title: "T", priority: "Urgent" }), /priority/, "keutamaan tidak sah");
setWho("Ustaz Anam");
const t = (await dispatch("POST", "/api/r/tasks", { title: "Tugasan Ujian", unit_id: u.id, member_id: m.id, priority: "High", start_date: "2026-01-01", deadline: "2026-01-05" })) as { id: number };
const get = async () => (await load()).tasks.find((x) => x.id === t.id)!;
let tk = await get(); const base = { ...tk };
await dispatch("PATCH", `/api/r/tasks/${t.id}`, { ...base, progress: 40 }); tk = await get(); ok(tk.status === "ongoing" && tk.progress === 40 && tk.is_draft === 0, "progress>0 => ongoing");
await dispatch("PATCH", `/api/r/tasks/${t.id}`, { ...tk, progress: 100 }); tk = await get(); ok(tk.status === "done" && !!tk.completed_at, "progress 100 => done");
await dispatch("PATCH", `/api/r/tasks/${t.id}`, { ...tk, status: "pending" }); tk = await get(); ok(tk.status === "pending" && tk.progress === 0 && !tk.completed_at, "pending => reset");
await dispatch("PATCH", `/api/r/tasks/${t.id}`, { ...tk, status: "done" }); tk = await get(); ok(tk.progress === 100, "done => 100%");
D = await load(); ok(D.taskLog.filter((l) => l.task_id === t.id).length === 5 && D.taskLog.every((l) => l.by_user === "Ustaz Anam"), "log kemajuan atas nama pengguna");
ok(stats(D.tasks).total === 25, "statistik dikira");
await dispatch("PATCH", `/api/r/tasks/${t.id}`, { ...tk, status: "ongoing", progress: 30 });
const other = D.units.find((x) => x.name === "Teknikal")!;
await dispatch("PATCH", `/api/r/members/${m.id}`, { name: "Ustaz Ujian 2", unit_id: other.id, position: "Ahli", phone: "" });
ok((await get()).unit_id === other.id, "tugasan terbuka berpindah bersama ahli");

console.log("# Lampiran");
const fd = new FormData(); fd.append("file", new File(["hello"], "nota.txt", { type: "text/plain" }));
await dispatch("POST", `/api/tasks/${t.id}/attachments`, fd);
D = await load(); const att = D.attachments.find((a) => a.task_id === t.id);
ok(!!att && att.url.includes(att.stored) && att.name === "nota.txt", "lampiran dimuat naik & dipaut");
const big = new FormData(); big.append("file", new File([new Uint8Array(11 * 1024 * 1024)], "besar.bin"));
await rejects(dispatch("POST", `/api/tasks/${t.id}/attachments`, big), /10MB/, "fail >10MB");
await dispatch("DELETE", `/api/attachments/${att!.id}`); ok((await load()).attachments.length === 0 && client._files.size === 0, "lampiran dipadam");

console.log("# Susulan");
const fu = (await dispatch("POST", "/api/r/followups", { member_id: m.id, task_id: t.id, contacted_at: "2026-11-05T10:00", method: "WhatsApp", summary: "Tanya status", responded: 0, next_followup: "2026-11-08" })) as { id: number };
await rejects(dispatch("POST", "/api/r/followups", { member_id: m.id, contacted_at: "x", method: "Telepati" }), /method/, "kaedah tidak sah");
await dispatch("PATCH", `/api/r/followups/${fu.id}`, { member_id: m.id, task_id: t.id, contacted_at: "2026-11-05T10:00", method: "Panggilan", summary: "Tanya", responded: 1, response: "Siap 50%", next_followup: null });
D = await load(); ok(D.followups.find((f) => f.id === fu.id)?.response === "Siap 50%" && D.followups[0].created_by === "Ustaz Anam", "susulan disimpan & dikemas kini");
const rows = followRows(D); ok(rows.some((r) => r.member.id === m.id) && rows.length > 10, "senarai susulan dijana");
ok(attention(D).members.length > 0, "panel perhatian pengarah");

console.log("# Pantauan Pengarah");
const tl = D.tasks.find((x) => x.id === t.id)!;
const w1 = (await dispatch("POST", "/api/r/watch", { title: "Pastikan perasmi sahkan", notes: "Hubungi pejabat", owner: "Pengarah", priority: "Critical", due_date: addDays(todayStr(), 1) })) as { id: number };
const w2 = (await dispatch("POST", "/api/r/watch", { title: "Pantau tugasan ujian", task_id: tl.id, owner: "Timbalan Pengarah" })) as { id: number };
await rejects(dispatch("POST", "/api/r/watch", { title: " " }), /diperlukan/, "tajuk pantauan kosong");
await rejects(dispatch("POST", "/api/r/watch", { title: "x", owner: "Orang Lain" }), /owner/, "pemilik tidak sah");
D = await load(); ok(D.watch.length === 2 && D.watch[0].created_by === "Ustaz Anam" && D.watch[0].notes === "Hubungi pejabat", "pantauan disimpan");
ok(watchUrgent(D).map((w) => w.id).sort().join() === [w1.id, w2.id].sort().join(), "mendesak: tarikh hampir (w1) dan tugasan berkaitan lewat (w2)");
await dispatch("PATCH", `/api/r/watch/${w2.id}`, { title: "Pantau tugasan ujian", task_id: tl.id, owner: "Berdua", notes: "nota baharu", due_date: null, priority: "High" });
D = await load(); ok(D.watch.find((w) => w.id === w2.id)!.owner === "Berdua" && D.watch.find((w) => w.id === w2.id)!.notes === "nota baharu", "sunting pantauan");
await dispatch("PATCH", `/api/r/watch/${w1.id}`, { done: true });
D = await load(); const done1 = D.watch.find((w) => w.id === w1.id)!; ok(done1.done === 1 && done1.done_by === "Ustaz Anam" && watchUrgent(D).map((w) => w.id).join() === String(w2.id), "tanda siap menyingkirkan dari mendesak");
await dispatch("PATCH", `/api/r/watch/${w1.id}`, { done: false }); ok((await load()).watch.find((w) => w.id === w1.id)!.done === 0, "buka semula pantauan");
const tmp = (await dispatch("POST", "/api/r/tasks", { title: "Sementara", unit_id: u.id })) as { id: number };
const w3 = (await dispatch("POST", "/api/r/watch", { title: "Pantau sementara", task_id: tmp.id })) as { id: number };
await dispatch("DELETE", `/api/r/tasks/${tmp.id}`); D = await load();
ok(D.watch.find((w) => w.id === w3.id)!.task_id === null, "padam tugasan tidak memadam pantauan (pautan dikosongkan)");
await dispatch("DELETE", `/api/r/watch/${w3.id}`);
await dispatch("DELETE", `/api/r/watch/${w1.id}`); await dispatch("DELETE", `/api/r/watch/${w2.id}`); ok((await load()).watch.length === 0, "padam pantauan");
const bk = JSON.parse((await import("../src/lib/repo")).exportBackup ? await (await import("../src/lib/repo")).exportBackup() : "{}"); ok("watch" in bk, "sandaran merangkumi pantauan");
console.log("# Senarai semak, tetapan, laporan");
const c0 = D.checklist[0];
await dispatch("PATCH", `/api/r/checklist/${c0.id}`, { done: true });
D = await load(); ok(D.checklist.find((c) => c.id === c0.id)!.done === 1 && D.checklist.find((c) => c.id === c0.id)!.done_by === "Ustaz Anam", "tanda item direkod");
const ci = (await dispatch("POST", "/api/r/checklist", { category: "Ujian", title: "Item" })) as { id: number };
await dispatch("PATCH", `/api/r/checklist/${ci.id}`, { category: "Ujian", title: "Item 2" }); await dispatch("DELETE", `/api/r/checklist/${ci.id}`);
await rejects(dispatch("PATCH", "/api/settings", { ...D.settings, event_date: "bukan" }), /tidak sah/, "tetapan tidak sah");
await dispatch("PATCH", "/api/settings", { ...D.settings, stale_days: 5 }); D = await load(); ok(D.settings.stale_days === "5", "tetapan disimpan");
for (const type of ["keseluruhan", "unit", "ahli", "tertunggak", "lewat", "mingguan"]) {
  const r = buildReport(D, type, { unitId: other.id, memberId: m.id });
  ok(r.title && r.sections.length > 0, `laporan ${type}`);
  const rec = (await dispatch("POST", "/api/r/reports", { type, title: r.title, payload: r })) as { id: number };
  const back = (await dispatch("GET", `/api/reports/${rec.id}`)) as { payload: { title: string } };
  ok(back.payload.title === r.title, `laporan ${type} disimpan & dibaca semula (jsonb)`);
}
ok((await load()).reports.length === 6, "sejarah laporan");

console.log("# Pemadaman");
await dispatch("DELETE", `/api/r/members/${m.id}`);
ok((await get()).member_id === null, "tugasan menjadi tidak ditugaskan");
await dispatch("DELETE", `/api/r/tasks/${t.id}`);
D = await load(); ok(!D.tasks.some((x) => x.id === t.id) && !D.taskLog.some((l) => l.task_id === t.id), "tugasan & log dipadam");
await dispatch("DELETE", `/api/r/units/${u.id}`); ok(!(await load()).units.some((x) => x.id === u.id), "unit kosong dipadam");

console.log(`\nLulus: ${pass}  Gagal: ${fail}`);
await pool.end();
process.exit(fail ? 1 : 0);
