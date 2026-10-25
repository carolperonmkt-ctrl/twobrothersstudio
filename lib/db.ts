import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SEED } from "./seed";

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const g = globalThis as unknown as { __db?: Database.Database };

function open() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      platform TEXT NOT NULL CHECK (platform IN ('instagram','facebook','tiktok')),
      name TEXT NOT NULL,
      external_id TEXT,
      access_token TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('feed','reel','story')),
      caption TEXT NOT NULL DEFAULT '',
      media_file TEXT NOT NULL,
      media_kind TEXT NOT NULL CHECK (media_kind IN ('image','video')),
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      attempts INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      remote_id TEXT,
      published_at TEXT
    );
    CREATE INDEX IF NOT EXISTS posts_due ON posts(status, scheduled_at);
    CREATE TABLE IF NOT EXISTS dm_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      reply TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      remote_id TEXT UNIQUE,
      contact_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('in','out')),
      text TEXT NOT NULL,
      auto INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      handled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS discovered (
      page_id TEXT PRIMARY KEY,
      page_name TEXT NOT NULL,
      page_token TEXT NOT NULL,
      ig_id TEXT,
      ig_username TEXT
    );
  `);
  if (!db.prepare("SELECT 1 FROM clients LIMIT 1").get()) seed(db);
  return db;
}

function seed(db: Database.Database) {
  const addClient = db.prepare("INSERT INTO clients (name) VALUES (?)");
  const addAccount = db.prepare(
    "INSERT INTO accounts (client_id, platform, name) VALUES (?, ?, ?)",
  );
  db.transaction(() => {
    for (const c of SEED) {
      const id = Number(addClient.run(c.name).lastInsertRowid);
      for (const a of c.accounts) addAccount.run(id, a.platform, a.name);
    }
  })();
}

export function db() {
  return (g.__db ??= open());
}
