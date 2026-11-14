// All statistics are derived from the real task/session/log data in the browser,
// in the user's local timezone. Pure functions so they can be unit-tested.
import { REASONS } from './constants.js';

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' in local time. */
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

export function formatDuration(seconds) {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function dueLabel(dateStr, today = localDate()) {
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, 1)) return 'Tomorrow';
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Seconds of focus time per task id. */
export function focusByTask(sessions) {
  const map = {};
  for (const s of sessions) map[s.task_id] = (map[s.task_id] || 0) + s.duration;
  return map;
}

/** Counts for tasks due today, plus today's list (which also shows overdue unfinished tasks). */
export function todaySummary(tasks, today = localDate()) {
  const due = tasks.filter((t) => t.due_date === today);
  const completed = due.filter((t) => t.status === 'completed').length;
  return {
    planned: due.length,
    completed,
    delayed: due.filter((t) => t.status === 'delayed').length,
    percent: due.length ? Math.round((completed / due.length) * 100) : 0,
    list: tasks.filter((t) => t.due_date === today || (t.due_date < today && t.status !== 'completed')),
  };
}

/** Tasks completed on each of the last 7 local days (oldest first). */
export function weeklyCompletions(tasks, today = localDate()) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return {
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
      completed: tasks.filter((t) => t.completed_at && localDate(new Date(t.completed_at)) === date).length,
    };
  });
}

/** Totals for the last 7 days, used on the dashboard. */
export function weekSummary({ tasks, sessions, logs }, today = localDate()) {
  const start = addDays(today, -6);
  const inWeek = (iso) => {
    const d = localDate(new Date(iso));
    return d >= start && d <= today;
  };
  return {
    completed: tasks.filter((t) => t.completed_at && inWeek(t.completed_at)).length,
    focusSeconds: sessions.filter((s) => inWeek(s.start_time)).reduce((sum, s) => sum + s.duration, 0),
    delays: logs.filter((l) => inWeek(l.created_at)).length,
  };
}

export function insights({ tasks, sessions, logs }) {
  const focus = focusByTask(sessions);
  const workedIds = Object.keys(focus);
  const totalFocus = sessions.reduce((sum, s) => sum + s.duration, 0);

  // Ties keep the order of REASONS (stable sort).
  const reasonCounts = REASONS.map((reason) => ({ reason, count: logs.filter((l) => l.reason === reason).length }))
    .filter((r) => r.count)
    .sort((a, b) => b.count - a.count);

  // A task counts as delayed if it was ever logged as delayed, or is currently marked Delayed.
  const delayedIds = new Set([...logs.map((l) => l.task_id), ...tasks.filter((t) => t.status === 'delayed').map((t) => t.id)]);

  // Sessions arrive newest first: compare the 6 most recently worked-on tasks.
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const plannedVsActual = [...new Set(sessions.map((s) => s.task_id))]
    .slice(0, 6)
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((t) => ({ name: t.title, planned: t.estimated_duration, actual: Math.round(focus[t.id] / 6) / 10 })); // minutes, 1 decimal

  return {
    completed: tasks.filter((t) => t.status === 'completed').length,
    delayedTasks: delayedIds.size,
    delayCount: logs.length,
    avgSecondsPerTask: workedIds.length ? totalFocus / workedIds.length : 0,
    topReason: reasonCounts[0] ?? null,
    reasonCounts,
    plannedVsActual,
    weekly: weeklyCompletions(tasks),
  };
}
