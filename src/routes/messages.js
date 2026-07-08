// src/routes/messages.js
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, chatId } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

function rowToMessage(r) {
  return {
    id: r.id,
    from: r.from_email,
    type: r.type,
    text: r.text,
    media: r.media,
    duration: r.duration,
    callStatus: r.call_status,
    ts: r.ts,
    read: !!r.read,
  };
}

// GET /api/messages/:peerEmail  -> full history with that peer
router.get('/:peerEmail', (req, res) => {
  const peerEmail = req.params.peerEmail.toLowerCase();
  const cid = chatId(req.userEmail, peerEmail);
  const rows = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY ts ASC').all(cid);
  res.json({ messages: rows.map(rowToMessage) });
});

// POST /api/messages/:peerEmail
// body: { type, text?, media?, duration?, callStatus? }
router.post('/:peerEmail', (req, res) => {
  const peerEmail = req.params.peerEmail.toLowerCase();
  const peer = db.prepare('SELECT email FROM users WHERE email = ?').get(peerEmail);
  if (!peer) return res.status(404).json({ error: 'Получатель не найден' });

  const { type, text, media, duration, callStatus } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type обязателен' });

  const cid = chatId(req.userEmail, peerEmail);
  const id = crypto.randomUUID();
  const ts = Date.now();

  db.prepare(
    `INSERT INTO messages (id, chat_id, from_email, type, text, media, duration, call_status, ts, read)
     VALUES (?,?,?,?,?,?,?,?,?,0)`
  ).run(id, cid, req.userEmail, type, text || null, media || null, duration || null, callStatus || null, ts);

  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  res.json({ message: rowToMessage(row) });
});

// POST /api/messages/:peerEmail/read  -> marks all messages from peer as read
router.post('/:peerEmail/read', (req, res) => {
  const peerEmail = req.params.peerEmail.toLowerCase();
  const cid = chatId(req.userEmail, peerEmail);
  db.prepare('UPDATE messages SET read = 1 WHERE chat_id = ? AND from_email = ?').run(cid, peerEmail);
  res.json({ ok: true });
});

module.exports = router;
