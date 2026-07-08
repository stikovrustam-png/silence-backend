// src/routes/users.js
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();

function publicUser(row) {
  if (!row) return null;
  return { email: row.email, name: row.name, username: row.username, avatar: row.avatar };
}

router.use(authMiddleware);

// GET /api/users/search?q=...  (by name, username or email)
router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [] });
  const rows = db
    .prepare(
      `SELECT * FROM users
       WHERE email != ? AND (
         lower(name) LIKE ? OR lower(username) LIKE ? OR lower(email) LIKE ?
       ) LIMIT 30`
    )
    .all(req.userEmail, `%${q}%`, `%${q}%`, `%${q}%`);
  res.json({ users: rows.map(publicUser) });
});

// GET /api/users/:email
router.get('/:email', (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(req.params.email.toLowerCase());
  if (!row) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user: publicUser(row) });
});

// PATCH /api/users/me { name?, avatar? }
router.patch('/me', (req, res) => {
  const { name, avatar } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.userEmail);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const newName = name !== undefined ? String(name).trim() : user.name;
  const newAvatar = avatar !== undefined ? avatar : user.avatar;
  db.prepare('UPDATE users SET name = ?, avatar = ? WHERE email = ?').run(newName, newAvatar, req.userEmail);
  const updated = db.prepare('SELECT * FROM users WHERE email = ?').get(req.userEmail);
  res.json({ user: publicUser(updated) });
});

// PATCH /api/users/me/username { username }
router.patch('/me/username', (req, res) => {
  const raw = String((req.body || {}).username || '').trim().toLowerCase().replace(/^@/, '');
  if (!raw) return res.status(400).json({ error: 'Username не может быть пустым' });
  if (!/^[a-z0-9_]{3,30}$/.test(raw)) {
    return res.status(400).json({ error: 'Username: 3–30 символов, только a-z, 0-9, _' });
  }
  const taken = db.prepare('SELECT email FROM users WHERE username = ?').get(raw);
  if (taken && taken.email !== req.userEmail) {
    return res.status(409).json({ error: 'Этот username уже занят' });
  }
  db.prepare('UPDATE users SET username = ? WHERE email = ?').run(raw, req.userEmail);
  const updated = db.prepare('SELECT * FROM users WHERE email = ?').get(req.userEmail);
  res.json({ user: publicUser(updated) });
});

// DELETE /api/users/me/avatar
router.delete('/me/avatar', (req, res) => {
  db.prepare('UPDATE users SET avatar = NULL WHERE email = ?').run(req.userEmail);
  res.json({ ok: true });
});

module.exports = router;
