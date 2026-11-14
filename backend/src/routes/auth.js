import { Router } from 'express';
import { endSession, hashPassword, requireAuth, startSession, verifyPassword } from '../auth.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v) => (typeof v === 'string' ? v : '');
const PUBLIC_FIELDS = 'id, name, email, created_at';

// Slow down password guessing: 10 failed sign-ins per IP per 15 minutes.
// shortcut: in-memory, resets on restart and isn't shared between instances; use a shared store if scaled out.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const isBlocked = (ip) => {
  const f = failures.get(ip);
  return !!f && f.resetAt > Date.now() && f.count >= 10;
};
const recordFailure = (ip) => {
  if (failures.size > 10000) failures.clear();
  const f = failures.get(ip);
  if (!f || f.resetAt <= Date.now()) failures.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else f.count++;
};

export default function authRoutes(db) {
  const r = Router();

  r.post('/signup', async (req, res) => {
    const name = text(req.body?.name).trim();
    const email = text(req.body?.email).trim().toLowerCase();
    const password = text(req.body?.password);
    if (!name || name.length > 50) return res.status(400).json({ error: 'Name must be 1–50 characters' });
    if (!EMAIL.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8–128 characters' });

    let id;
    try {
      ({ lastInsertRowid: id } = db
        .prepare('INSERT INTO Users (name, email, password_hash) VALUES (?, ?, ?)')
        .run(name, email, await hashPassword(password)));
    } catch (err) {
      if (/UNIQUE/.test(err.message)) return res.status(409).json({ error: 'An account with this email already exists' });
      throw err;
    }
    startSession(db, req, res, id);
    res.status(201).json(db.prepare(`SELECT ${PUBLIC_FIELDS} FROM Users WHERE id = ?`).get(id));
  });

  r.post('/login', async (req, res) => {
    if (isBlocked(req.ip)) return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
    const email = text(req.body?.email).trim().toLowerCase();
    const password = text(req.body?.password);
    const user = db.prepare('SELECT * FROM Users WHERE email = ?').get(email);
    if (!user?.password_hash || !password || !(await verifyPassword(password, user.password_hash))) {
      recordFailure(req.ip);
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    failures.delete(req.ip);
    startSession(db, req, res, user.id);
    res.json(db.prepare(`SELECT ${PUBLIC_FIELDS} FROM Users WHERE id = ?`).get(user.id));
  });

  // Needs the current password too, so a borrowed or stolen session can't lock the owner out.
  r.post('/password', requireAuth(db), async (req, res) => {
    if (isBlocked(req.ip)) return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
    const current = text(req.body?.current_password);
    const next = text(req.body?.new_password);
    const { password_hash } = db.prepare('SELECT password_hash FROM Users WHERE id = ?').get(req.user.id);
    if (!current || !(await verifyPassword(current, password_hash))) {
      recordFailure(req.ip);
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    if (next.length < 8 || next.length > 128) return res.status(400).json({ error: 'New password must be 8–128 characters' });
    db.prepare('UPDATE Users SET password_hash = ? WHERE id = ?').run(await hashPassword(next), req.user.id);
    // Sign out every other device; keep this one signed in with a fresh session.
    db.prepare('DELETE FROM AuthSessions WHERE user_id = ?').run(req.user.id);
    startSession(db, req, res, req.user.id);
    res.status(204).end();
  });

  r.post('/logout', (req, res) => {
    endSession(db, req, res);
    res.status(204).end();
  });

  return r;
}
