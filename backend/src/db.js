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
  return db;
}

// Single local profile: the app has exactly one user (no authentication by design).
export const getUser = (db) => db.prepare('SELECT * FROM Users ORDER BY id LIMIT 1').get();
