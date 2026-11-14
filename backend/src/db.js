import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STATUSES = ['pending', 'in_progress', 'completed', 'delayed'];
export const REASONS = [
  'Lack of motivation',
  'Social media distraction',
  'Tiredness',
  'Fear of failure',
  'Task feels difficult',
  'Other',
];

const DEFAULT_PATH = fileURLToPath(new URL('../data/laterless.db', import.meta.url));

export function openDb(file = process.env.DB_PATH || DEFAULT_PATH) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  // Databases created before accounts existed have no login columns; add them.
  // Their old profile has no email/password, so it can't be signed into.
  if (!db.prepare('PRAGMA table_info(Users)').all().some((c) => c.name === 'email')) {
    db.exec(`ALTER TABLE Users ADD COLUMN email TEXT;
             ALTER TABLE Users ADD COLUMN password_hash TEXT;
             CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON Users(email);`);
  }
  return db;
}
