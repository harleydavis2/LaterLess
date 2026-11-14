import { Router } from 'express';
import { currentUser, requireAuth } from '../auth.js';

export default function userRoutes(db) {
  const r = Router();

  // null when signed out, so the app knows to show the sign-in page.
  r.get('/', (req, res) => res.json(currentUser(db, req)));

  r.put('/', requireAuth(db), (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 50) return res.status(400).json({ error: 'Name must be 1–50 characters' });
    db.prepare('UPDATE Users SET name = ? WHERE id = ?').run(name, req.user.id);
    res.json(currentUser(db, req));
  });

  return r;
}
