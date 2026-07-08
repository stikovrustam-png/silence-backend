// src/routes/chats.js
const express = require('express');
const db = require('../db');
const { authMiddleware, chatId } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

function publicUser(row) {
  if (!row) return null;
  return { email: row.email, name: row.name, username: row.username, avatar: row.avatar };
}

// GET /api/chats  -> list of peers in this user's chat list, most recent first
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT peer_email FROM chat_members WHERE owner_email = ? ORDER BY position ASC')
    .all(req.userEmail);

  const favSet = new Set(
    db.prepare('SELECT peer_email FROM favorites WHERE owner_email = ?').all(req.userEmail).map((r) => r.peer_email)
  );

  const chats = rows.map((r) => {
    const peer = db.prepare('SELECT * FROM users WHERE email = ?').get(r.peer_email);
    const cid = chatId(req.userEmail, r.peer_email);
    const lastMsg = db
      .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY ts DESC LIMIT 1')
      .get(cid);
    const unread = db
      .prepare('SELECT COUNT(*) AS c FROM messages WHERE chat_id = ? AND from_email != ? AND read = 0')
      .get(cid, req.userEmail).c;
    return {
      user: publicUser(peer),
      favorite: favSet.has(r.peer_email),
      lastMessage: lastMsg || null,
      unread,
    };
  });

  res.json({ chats });
});

// POST /api/chats/open { email } -> adds peer to both chat lists (idempotent)
router.post('/open', (req, res) => {
  const peerEmail = String((req.body || {}).email || '').toLowerCase();
  if (!peerEmail) return res.status(400).json({ error: 'email обязателен' });
  const peer = db.prepare('SELECT * FROM users WHERE email = ?').get(peerEmail);
  if (!peer) return res.status(404).json({ error: 'Пользователь не найден' });

  addToChatList(req.userEmail, peerEmail);
  // Mirror on the peer's side too (support/system accounts can be excluded by convention)
  addToChatList(peerEmail, req.userEmail);

  res.json({ ok: true });
});

function addToChatList(owner, peer) {
  const existing = db
    .prepare('SELECT * FROM chat_members WHERE owner_email = ? AND peer_email = ?')
    .get(owner, peer);
  if (existing) return;
  const maxPos = db
    .prepare('SELECT MIN(position) AS m FROM chat_members WHERE owner_email = ?')
    .get(owner).m;
  const newPos = maxPos === null || maxPos === undefined ? 0 : maxPos - 1;
  db.prepare('INSERT INTO chat_members (owner_email, peer_email, position) VALUES (?,?,?)').run(
    owner,
    peer,
    newPos
  );
}

// POST /api/chats/:email/favorite { on: true|false }
router.post('/:email/favorite', (req, res) => {
  const peerEmail = req.params.email.toLowerCase();
  const on = !!(req.body || {}).on;
  if (on) {
    db.prepare('INSERT OR IGNORE INTO favorites (owner_email, peer_email) VALUES (?,?)').run(
      req.userEmail,
      peerEmail
    );
  } else {
    db.prepare('DELETE FROM favorites WHERE owner_email = ? AND peer_email = ?').run(
      req.userEmail,
      peerEmail
    );
  }
  res.json({ ok: true });
});

module.exports = router;
