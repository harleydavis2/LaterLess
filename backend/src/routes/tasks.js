import { Router } from 'express';
import { STATUSES, getUser } from '../db.js';

const FIELDS = ['title', 'description', 'due_date', 'estimated_duration', 'status'];

function validateTask(t) {
  if (typeof t.title !== 'string' || !t.title.trim()) return 'Title is required';
  if (t.title.trim().length > 120) return 'Title must be 120 characters or fewer';
  if (t.description != null && typeof t.description !== 'string') return 'Description must be text';
  if (t.description && t.description.length > 1000) return 'Description must be 1000 characters or fewer';
  if (typeof t.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.due_date) || isNaN(Date.parse(t.due_date)))
    return 'Due date must be a valid date (YYYY-MM-DD)';
  if (!Number.isInteger(t.estimated_duration) || t.estimated_duration < 1 || t.estimated_duration > 1440)
    return 'Estimated duration must be a whole number of minutes between 1 and 1440';
  if (!STATUSES.includes(t.status)) return `Status must be one of: ${STATUSES.join(', ')}`;
  return null;
}

const pick = (body = {}) => Object.fromEntries(FIELDS.filter((f) => f in body).map((f) => [f, body[f]]));

export default function taskRoutes(db) {
  const r = Router();
  const find = (id, userId) => db.prepare('SELECT * FROM Tasks WHERE id = ? AND user_id = ?').get(id, userId);

  // Every task route needs the profile to exist.
  r.use((req, res, next) => {
    req.user = getUser(db);
    if (!req.user) return res.status(400).json({ error: 'Create a profile first' });
    next();
  });

  r.get('/', (req, res) => {
    const { status } = req.query;
    if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status filter' });
    const rows = status
      ? db.prepare('SELECT * FROM Tasks WHERE user_id = ? AND status = ? ORDER BY due_date, id').all(req.user.id, status)
      : db.prepare('SELECT * FROM Tasks WHERE user_id = ? ORDER BY due_date, id').all(req.user.id);
    res.json(rows);
  });

  r.post('/', (req, res) => {
    const t = { description: null, status: 'pending', ...pick(req.body) };
    const error = validateTask(t);
    if (error) return res.status(400).json({ error });
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO Tasks (user_id, title, description, due_date, estimated_duration, status, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        t.title.trim(),
        t.description?.trim() || null,
        t.due_date,
        t.estimated_duration,
        t.status,
        t.status === 'completed' ? new Date().toISOString() : null
      );
    res.status(201).json(find(lastInsertRowid, req.user.id));
  });

  // Partial update: merge the sent fields over the stored task, then validate the result.
  r.patch('/:id', (req, res) => {
    const existing = find(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const t = { ...existing, ...pick(req.body) };
    const error = validateTask(t);
    if (error) return res.status(400).json({ error });
    const completedAt =
      t.status !== 'completed' ? null : existing.status === 'completed' ? existing.completed_at : new Date().toISOString();
    db.prepare(
      `UPDATE Tasks SET title = ?, description = ?, due_date = ?, estimated_duration = ?, status = ?, completed_at = ?
       WHERE id = ?`
    ).run(t.title.trim(), t.description?.trim() || null, t.due_date, t.estimated_duration, t.status, completedAt, existing.id);
    res.json(find(existing.id, req.user.id));
  });

  // Sessions and procrastination logs are removed with the task (ON DELETE CASCADE).
  r.delete('/:id', (req, res) => {
    const { changes } = db.prepare('DELETE FROM Tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (!changes) return res.status(404).json({ error: 'Task not found' });
    res.status(204).end();
  });

  return r;
}
