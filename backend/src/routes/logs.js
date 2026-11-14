import { Router } from 'express';
import { REASONS, getUser } from '../db.js';
import { ownsTask } from './sessions.js';

export default function logRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT l.*, t.title AS task_title FROM ProcrastinationLogs l
           JOIN Tasks t ON t.id = l.task_id WHERE t.user_id = ? ORDER BY l.created_at DESC, l.id DESC`
        )
        .all(getUser(db)?.id ?? -1)
    );
  });

  // Logging a delay also marks the task as Delayed (unless it is already completed).
  r.post('/', (req, res) => {
    const { task_id, reason, note } = req.body ?? {};
    if (!Number.isInteger(task_id) || !ownsTask(db, task_id)) return res.status(400).json({ error: 'Unknown task' });
    if (!REASONS.includes(reason)) return res.status(400).json({ error: 'Pick one of the listed reasons' });
    if (note != null && (typeof note !== 'string' || note.length > 500))
      return res.status(400).json({ error: 'Note must be text of 500 characters or fewer' });

    db.exec('BEGIN');
    try {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO ProcrastinationLogs (task_id, reason, note) VALUES (?, ?, ?)')
        .run(task_id, reason, note?.trim() || null);
      db.prepare("UPDATE Tasks SET status = 'delayed' WHERE id = ? AND status != 'completed'").run(task_id);
      db.exec('COMMIT');
      res.status(201).json(db.prepare('SELECT * FROM ProcrastinationLogs WHERE id = ?').get(lastInsertRowid));
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  });

  return r;
}
