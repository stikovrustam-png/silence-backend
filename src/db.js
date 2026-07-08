// src/db.js
// SQLite storage for the Silence messenger backend.
// Uses a single file DB (data.sqlite). Render's free tier disk is ephemeral
// unless you attach a persistent disk — see README for details.

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  avatar TEXT,              -- base64 data URL or NULL
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_members (
  owner_email TEXT NOT NULL,   -- whose chat list this entry belongs to
  peer_email TEXT NOT NULL,    -- the other participant
  position INTEGER NOT NULL,   -- ordering (0 = most recent / top)
  PRIMARY KEY (owner_email, peer_email)
);

CREATE TABLE IF NOT EXISTS favorites (
  owner_email TEXT NOT NULL,
  peer_email TEXT NOT NULL,
  PRIMARY KEY (owner_email, peer_email)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,       -- deterministic id derived from the two emails
  from_email TEXT NOT NULL,
  type TEXT NOT NULL,          -- text | image | video | voice | call
  text TEXT,
  media TEXT,                  -- base64 data URL or NULL
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

module.exports = db;
