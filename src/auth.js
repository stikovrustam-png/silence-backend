// src/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function signToken(email) {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

// Same deterministic chat id logic as the frontend (sorted emails joined).
function chatId(a, b) {
  return [a, b].sort().join('::');
}

module.exports = { signToken, authMiddleware, chatId, JWT_SECRET };
