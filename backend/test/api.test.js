import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

test('API: profile, task CRUD, delay logging, focus sessions, cascade delete', async () => {
  const server = createApp(openDb(':memory:')).listen(0);
  const base = `http://localhost:${server.address().port}/api`;
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };

  try {
    assert.equal((await call('GET', '/user')).body, null);
    assert.equal((await call('POST', '/tasks', { title: 'x' })).status, 400, 'tasks need a profile');
    assert.equal((await call('PUT', '/user', { name: '  ' })).status, 400);
    assert.equal((await call('PUT', '/user', { name: 'Sam' })).body.name, 'Sam');

    const bad = await call('POST', '/tasks', { title: 'Essay', due_date: '2026-13-45', estimated_duration: 30 });
    assert.equal(bad.status, 400);

    const { status, body: task } = await call('POST', '/tasks', {
      title: ' Essay ', due_date: '2026-11-14', estimated_duration: 45,
    });
    assert.equal(status, 201);
    assert.equal(task.title, 'Essay');
    assert.equal(task.status, 'pending');
    assert.equal(task.completed_at, null);

    const log = await call('POST', '/logs', { task_id: task.id, reason: 'Tiredness', note: 'late night' });
    assert.equal(log.status, 201);
    assert.equal((await call('POST', '/logs', { task_id: task.id, reason: 'Bored' })).status, 400);
    assert.equal((await call('GET', '/tasks?status=delayed')).body.length, 1, 'logging marks task delayed');

    const done = await call('PATCH', `/tasks/${task.id}`, { status: 'completed' });
    assert.ok(done.body.completed_at);
    assert.equal((await call('PATCH', `/tasks/${task.id}`, { status: 'pending' })).body.completed_at, null);
    assert.equal((await call('PATCH', `/tasks/${task.id}`, { estimated_duration: 0 })).status, 400);

    const start = new Date('2026-11-14T10:00:00Z').toISOString();
    const end = new Date('2026-11-14T10:30:00Z').toISOString();
    assert.equal((await call('POST', '/sessions', { task_id: task.id, start_time: start, end_time: end, duration: 1500 })).status, 201);
    assert.equal((await call('POST', '/sessions', { task_id: task.id, start_time: start, end_time: end, duration: 9999 })).status, 400);
    assert.equal((await call('GET', '/sessions')).body[0].task_title, 'Essay');

    assert.equal((await call('DELETE', `/tasks/${task.id}`)).status, 204);
    assert.equal((await call('DELETE', `/tasks/${task.id}`)).status, 404);
    assert.equal((await call('GET', '/sessions')).body.length, 0, 'sessions cascade');
    assert.equal((await call('GET', '/logs')).body.length, 0, 'logs cascade');
    assert.equal((await call('GET', '/nope')).status, 404);
  } finally {
    server.close();
  }
});
