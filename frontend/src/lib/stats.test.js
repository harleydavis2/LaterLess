import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, formatDuration, insights, localDate, todaySummary, weekSummary, weeklyCompletions } from './stats.js';

const today = localDate();
const yesterday = addDays(today, -1);
const noon = (d) => new Date(`${d}T12:00:00`).toISOString();

const tasks = [
  { id: 1, title: 'Essay', due_date: today, estimated_duration: 60, status: 'completed', completed_at: noon(today) },
  { id: 2, title: 'Lab', due_date: today, estimated_duration: 30, status: 'delayed', completed_at: null },
  { id: 3, title: 'Reading', due_date: yesterday, estimated_duration: 20, status: 'pending', completed_at: null },
  { id: 4, title: 'Old', due_date: addDays(today, -10), estimated_duration: 10, status: 'completed', completed_at: noon(addDays(today, -10)) },
];
const sessions = [
  { task_id: 2, duration: 600, start_time: noon(today) },
  { task_id: 1, duration: 3000, start_time: noon(today) },
  { task_id: 1, duration: 600, start_time: noon(yesterday) },
];
const logs = [
  { task_id: 2, reason: 'Tiredness', created_at: noon(today) },
  { task_id: 3, reason: 'Tiredness', created_at: noon(yesterday) },
  { task_id: 2, reason: 'Fear of failure', created_at: noon(today) },
];

test('todaySummary counts tasks due today and lists overdue unfinished ones', () => {
  const s = todaySummary(tasks, today);
  assert.deepEqual([s.planned, s.completed, s.delayed, s.percent], [2, 1, 1, 50]);
  assert.deepEqual(s.list.map((t) => t.id), [1, 2, 3]);
  assert.equal(todaySummary([], today).percent, 0);
});

test('weekly numbers only include the last 7 days', () => {
  const week = weeklyCompletions(tasks, today);
  assert.equal(week.length, 7);
  assert.equal(week[6].date, today);
  assert.equal(week[6].completed, 1);
  assert.equal(week.reduce((n, d) => n + d.completed, 0), 1);
  assert.deepEqual(weekSummary({ tasks, sessions, logs }, today), { completed: 1, focusSeconds: 4200, delays: 3 });
});

test('insights', () => {
  const i = insights({ tasks, sessions, logs });
  assert.equal(i.completed, 2);
  assert.equal(i.delayedTasks, 2);
  assert.equal(i.delayCount, 3);
  assert.equal(i.avgSecondsPerTask, 2100);
  assert.deepEqual(i.topReason, { reason: 'Tiredness', count: 2 });
  assert.deepEqual(i.plannedVsActual, [
    { name: 'Lab', planned: 30, actual: 10 },
    { name: 'Essay', planned: 60, actual: 60 },
  ]);
  assert.equal(insights({ tasks: [], sessions: [], logs: [] }).topReason, null);
});

test('formatDuration', () => {
  assert.equal(formatDuration(42), '42s');
  assert.equal(formatDuration(1500), '25m');
  assert.equal(formatDuration(3900), '1h 5m');
});
