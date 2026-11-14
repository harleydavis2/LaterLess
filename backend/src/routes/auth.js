import { Router } from 'express';
import { endSession, hashPassword, startSession, verifyPassword } from '../auth.js';

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

  r.post('/logout', (req, res) => {
    endSession(db, req, res);
    res.status(204).end();
  });

  return r;
}
