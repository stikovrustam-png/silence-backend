// src/db.js
// SQLite storage for the Silence messenger backend.
// Uses Node's built-in node:sqlite (no native compilation needed —
// works out of the box in Termux/Android). Requires Node.js 22.5+.

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');
const raw = new DatabaseSync(DB_PATH);

raw.exec('PRAGMA journal_mode = WAL;');

raw.exec(`
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_members (
  owner_email TEXT NOT NULL,
  peer_email TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (owner_email, peer_email)
);

CREATE TABLE IF NOT EXISTS favorites (
  owner_email TEXT NOT NULL,
  peer_email TEXT NOT NULL,
  PRIMARY KEY (owner_email, peer_email)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  type TEXT NOT NULL,
  text TEXT,
  media TEXT,
  duration INTEGER,
  call_status TEXT,
  ts INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, ts);

CREATE TABLE IF NOT EXISTS settings (
  email TEXT PRIMARY KEY,
  notifications INTEGER NOT NULL DEFAULT 1,
  privacy_contacts_only INTEGER NOT NULL DEFAULT 0
);
`);

// Thin wrapper that mimics the subset of the better-sqlite3 API used
// throughout the routes (prepare().run/get/all), so route files don't
// need to change. node:sqlite's StatementSync already has get()/all()/run(),
// but statements must be prepared fresh each call in our usage pattern here
// is fine performance-wise for this app's scale.
const db = {
  prepare(sql) {
    const stmt = raw.prepare(sql);
    return {
      run: (...args) => stmt.run(...args),
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args),
    };
  },
  exec(sql) {
    return raw.exec(sql);
  },
};

module.exports = db;
