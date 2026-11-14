-- LaterLess database schema (SQLite). Timestamps are ISO-8601 UTC strings.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS Tasks (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  due_date            TEXT NOT NULL,              -- local date, YYYY-MM-DD
  estimated_duration  INTEGER NOT NULL,           -- minutes
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at        TEXT
);

CREATE TABLE IF NOT EXISTS FocusSessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER NOT NULL REFERENCES Tasks(id) ON DELETE CASCADE,
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  duration    INTEGER NOT NULL CHECK (duration > 0)  -- seconds actually worked (pauses excluded)
);

CREATE TABLE IF NOT EXISTS ProcrastinationLogs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER NOT NULL REFERENCES Tasks(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (reason IN (
                'Lack of motivation', 'Social media distraction', 'Tiredness',
                'Fear of failure', 'Task feels difficult', 'Other')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON Tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_task ON FocusSessions(task_id);
CREATE INDEX IF NOT EXISTS idx_logs_task ON ProcrastinationLogs(task_id);
