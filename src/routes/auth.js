// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authMiddleware } = require('../auth');

const router = express.Router();

function publicUser(row) {
  if (!row) return null;
  return {
    email: row.email,
    name: row.name,
    username: row.username,
    avatar: row.avatar,
  };
}

// POST /api/auth/register { email, password, name }
router.post('/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Заполните email, пароль и имя' });
  }
  const normEmail = String(email).trim().toLowerCase();
  const exists = db.prepare('SELECT email FROM users WHERE email = ?').get(normEmail);
  if (exists) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (email, name, username, password_hash, avatar, created_at) VALUES (?,?,?,?,?,?)'
  ).run(normEmail, name.trim(), null, hash, null, Date.now());
  db.prepare(
    'INSERT INTO settings (email, notifications, privacy_contacts_only) VALUES (?,1,0)'
  ).run(normEmail);

  const token = signToken(normEmail);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normEmail);
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/login { email, password }
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Заполните email и пароль' });
  const normEmail = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const token = signToken(normEmail);
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.userEmail);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
