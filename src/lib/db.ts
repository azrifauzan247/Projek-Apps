import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { SEED_UNITS, SEED_TASKS, SEED_CHECKLIST, DEFAULT_SETTINGS } from "./seed-data";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  position TEXT NOT NULL DEFAULT 'Ahli',
  phone TEXT NOT NULL DEFAULT '',
  extra_resp TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','leader','member')),
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
  start_date TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ongoing','done')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes TEXT NOT NULL DEFAULT '',
  is_draft INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS task_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL,
  progress INTEGER NOT NULL,
  by_user TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stored TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  mime TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  contacted_at TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'WhatsApp',
  summary TEXT NOT NULL DEFAULT '',
  responded INTEGER NOT NULL DEFAULT 0,
  response TEXT NOT NULL DEFAULT '',
  action_required TEXT NOT NULL DEFAULT '',
  next_followup TEXT,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  done_by TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tasks_unit ON tasks(unit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_member ON tasks(member_id);
CREATE INDEX IF NOT EXISTS idx_fu_member ON followups(member_id);
`;

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function init(): Database.Database {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "ajk.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seed(db);
  return db;
}

function seed(db: Database.Database) {
  const tx = db.transaction(() => {
    const setSetting = db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)");
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) setSetting.run(k, v);
    if (!db.prepare("SELECT 1 FROM settings WHERE key='auth_secret'").get()) {
      setSetting.run("auth_secret", crypto.randomBytes(32).toString("hex"));
    }
    if ((db.prepare("SELECT COUNT(*) c FROM units").get() as { c: number }).c > 0) return;

    const insUnit = db.prepare("INSERT INTO units(name,description,sort) VALUES (?,?,?)");
    const insMember = db.prepare("INSERT INTO members(name,unit_id,position,extra_resp,phone,sort) VALUES (?,?,?,?,?,?)");
    const unitIds: Record<string, number> = {};
    const memberIds: Record<string, number> = {};
    SEED_UNITS.forEach((u, ui) => {
      const uid = Number(insUnit.run(u.name, u.description ?? "", ui + 1).lastInsertRowid);
      unitIds[u.name] = uid;
      u.members.forEach((m, mi) => {
        const id = Number(insMember.run(m.name, uid, m.position, m.extra ?? "", m.phone ?? "", mi + 1).lastInsertRowid);
        memberIds[`${u.name}|${m.name}`] = id;
      });
    });

    const insTask = db.prepare(
      "INSERT INTO tasks(title,description,unit_id,member_id,priority,deadline,status,progress,notes,is_draft) VALUES (?,?,?,?,?,?, 'pending',0,?,1)"
    );
    for (const t of SEED_TASKS) {
      const unit = SEED_UNITS.find((u) => u.name === t.unit)!;
      const lead = unit.members.find((m) => m.position.startsWith("Ketua") || m.position === "Pengarah") ?? unit.members[0];
      insTask.run(
        t.title, t.description, unitIds[t.unit], memberIds[`${t.unit}|${lead.name}`], t.priority, t.deadline,
        "Tugasan permulaan (draf) dengan tarikh akhir cadangan – sila semak dengan kertas cadangan rasmi."
      );
    }
    const insCheck = db.prepare("INSERT INTO checklist(category,title,sort) VALUES (?,?,?)");
    let n = 0;
    for (const [cat, items] of SEED_CHECKLIST) for (const it of items) insCheck.run(cat, it, ++n);

    // Akaun admin awal
    const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString("base64url");
    const azri = memberIds["Pengarah (Bendahari & Protokol)|Ustaz Azri"];
    db.prepare("INSERT INTO users(username,password_hash,role,member_id) VALUES ('admin',?, 'admin',?)").run(bcrypt.hashSync(pw, 10), azri);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`\n=== AJK COMMAND CENTER: akaun admin dicipta ===\n  Nama pengguna: admin\n  Kata laluan  : ${pw}\n  (Tukar di Tetapan selepas log masuk)\n`);
    }
  });
  tx();
}

export function db(): Database.Database {
  if (!globalThis.__db) globalThis.__db = init();
  return globalThis.__db;
}

export function getSetting(key: string): string {
  const r = db().prepare("SELECT value FROM settings WHERE key=?").get(key) as { value: string } | undefined;
  return r?.value ?? "";
}
