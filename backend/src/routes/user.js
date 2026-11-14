import { Router } from 'express';
import { getUser } from '../db.js';

export default function userRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => res.json(getUser(db) ?? null));

  // Creates the profile on first use, renames it afterwards.
  r.put('/', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 50) return res.status(400).json({ error: 'Name must be 1–50 characters' });
    const user = getUser(db);
    if (user) db.prepare('UPDATE Users SET name = ? WHERE id = ?').run(name, user.id);
    else db.prepare('INSERT INTO Users (name) VALUES (?)').run(name);
    res.json(getUser(db));
  });

  return r;
}
