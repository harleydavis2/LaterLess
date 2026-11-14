import { Router } from 'express';
import { getUser } from '../db.js';

const ownsTask = (db, taskId) =>
  db.prepare('SELECT 1 FROM Tasks WHERE id = ? AND user_id = ?').get(taskId, getUser(db)?.id ?? -1);

export default function sessionRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT s.*, t.title AS task_title FROM FocusSessions s
           JOIN Tasks t ON t.id = s.task_id WHERE t.user_id = ? ORDER BY s.start_time DESC`
        )
        .all(getUser(db)?.id ?? -1)
    );
  });

  r.post('/', (req, res) => {
    const { task_id, start_time, end_time, duration } = req.body ?? {};
    const start = Date.parse(start_time);
    const end = Date.parse(end_time);
    if (!Number.isInteger(task_id) || !ownsTask(db, task_id)) return res.status(400).json({ error: 'Unknown task' });
    if (isNaN(start) || isNaN(end) || end < start) return res.status(400).json({ error: 'Invalid start or end time' });
    // Duration excludes pauses, so it can be shorter than the start–end span but never longer.
    if (!Number.isInteger(duration) || duration < 1 || duration > Math.ceil((end - start) / 1000) + 1)
      return res.status(400).json({ error: 'Invalid duration' });
    const { lastInsertRowid } = db
      .prepare('INSERT INTO FocusSessions (task_id, start_time, end_time, duration) VALUES (?, ?, ?, ?)')
      .run(task_id, new Date(start).toISOString(), new Date(end).toISOString(), duration);
    res.status(201).json(db.prepare('SELECT * FROM FocusSessions WHERE id = ?').get(lastInsertRowid));
  });

  return r;
}

export { ownsTask };
