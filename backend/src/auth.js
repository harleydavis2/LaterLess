import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const COOKIE = 'laterless_session';
const SESSION_DAYS = 30;
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const actual = await scryptAsync(password, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

const readToken = (req) => req.headers.cookie?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];

export function startSession(db, req, res, userId) {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 864e5);
  const token = randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM AuthSessions WHERE expires_at <= ?').run(now.toISOString());
  db.prepare('INSERT INTO AuthSessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expires.toISOString());
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, expires, path: '/' });
}

export function endSession(db, req, res) {
  const token = readToken(req);
  if (token) db.prepare('DELETE FROM AuthSessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(COOKIE, { path: '/' });
}

/** The signed-in user (without the password hash), or null. */
export function currentUser(db, req) {
  const token = readToken(req);
  if (!token) return null;
  return (
    db
      .prepare(
        `SELECT u.id, u.name, u.email, u.created_at FROM AuthSessions s JOIN Users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ?`
      )
      .get(sha256(token), new Date().toISOString()) ?? null
  );
}

export const requireAuth = (db) => (req, res, next) => {
  req.user = currentUser(db, req);
  if (!req.user) return res.status(401).json({ error: 'Please sign in' });
  next();
};
