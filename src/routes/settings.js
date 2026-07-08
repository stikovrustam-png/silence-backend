// src/routes/settings.js
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

function rowToSettings(r) {
  if (!r) return { notifications: true, privacyContactsOnly: false };
  return {
    notifications: !!r.notifications,
    privacyContactsOnly: !!r.privacy_contacts_only,
  };
}

// GET /api/settings/me
router.get('/me', (req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE email = ?').get(req.userEmail);
  res.json({ settings: rowToSettings(row) });
});

// PATCH /api/settings/me { notifications?, privacyContactsOnly? }
router.patch('/me', (req, res) => {
  const existing = db.prepare('SELECT * FROM settings WHERE email = ?').get(req.userEmail);
  const current = rowToSettings(existing);
  const { notifications, privacyContactsOnly } = req.body || {};
  const next = {
    notifications: notifications !== undefined ? !!notifications : current.notifications,
    privacyContactsOnly:
      privacyContactsOnly !== undefined ? !!privacyContactsOnly : current.privacyContactsOnly,
  };
  db.prepare(
    `INSERT INTO settings (email, notifications, privacy_contacts_only) VALUES (?,?,?)
     ON CONFLICT(email) DO UPDATE SET notifications = excluded.notifications,
       privacy_contacts_only = excluded.privacy_contacts_only`
  ).run(req.userEmail, next.notifications ? 1 : 0, next.privacyContactsOnly ? 1 : 0);
  res.json({ settings: next });
});

module.exports = router;
