import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

async function startServer() {
  const server = createApp(openDb(':memory:')).listen(0);
  const base = `http://localhost:${server.address().port}/api`;
  // A tiny client that keeps its own session cookie, like one browser.
  const client = () => {
    let cookie = '';
    return async (method, path, body) => {
      const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', cookie },
        body: body && JSON.stringify(body),
      });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return { status: res.status, body: res.status === 204 ? null : await res.json(), setCookie: set };
    };
  };
  return { server, client };
}

test('accounts: sign up, sign in, sign out, validation', async () => {
  const { server, client } = await startServer();
  const call = client();
  try {
    assert.equal((await call('GET', '/user')).body, null);
    assert.equal((await call('GET', '/tasks')).status, 401, 'tasks need a session');

    assert.equal((await call('POST', '/auth/signup', { name: 'Sam', email: 'bad', password: 'longenough' })).status, 400);
    assert.equal((await call('POST', '/auth/signup', { name: 'Sam', email: 'sam@x.io', password: 'short' })).status, 400);

    const signup = await call('POST', '/auth/signup', { name: 'Sam', email: ' Sam@X.io ', password: 'correct horse' });
    assert.equal(signup.status, 201);
    assert.equal(signup.body.email, 'sam@x.io');
    assert.equal(signup.body.password_hash, undefined, 'hash never leaves the server');
    assert.match(signup.setCookie, /HttpOnly/i);
    assert.equal((await call('GET', '/user')).body.name, 'Sam');

    assert.equal((await client()('POST', '/auth/signup', { name: 'X', email: 'sam@x.io', password: 'whatever1' })).status, 409);

    assert.equal((await call('POST', '/auth/logout')).status, 204);
    assert.equal((await call('GET', '/user')).body, null);
    assert.equal((await call('GET', '/tasks')).status, 401);

    assert.equal((await call('POST', '/auth/login', { email: 'sam@x.io', password: 'wrong pass' })).status, 401);
    assert.equal((await call('POST', '/auth/login', { email: 'nobody@x.io', password: 'whatever1' })).status, 401);
    const login = await call('POST', '/auth/login', { email: 'SAM@x.io', password: 'correct horse' });
    assert.equal(login.status, 200);
    assert.equal((await call('GET', '/user')).body.email, 'sam@x.io');

    assert.equal((await call('PUT', '/user', { name: 'Samantha' })).body.name, 'Samantha');

    // Change password: needs the current one, signs out other devices, keeps this one signed in.
    const laptop = client();
    await laptop('POST', '/auth/login', { email: 'sam@x.io', password: 'correct horse' });
    assert.equal((await call('POST', '/auth/password', { current_password: 'nope', new_password: 'new password 1' })).status, 400);
    assert.equal((await call('POST', '/auth/password', { current_password: 'correct horse', new_password: 'short' })).status, 400);
    assert.equal((await call('POST', '/auth/password', { current_password: 'correct horse', new_password: 'new password 1' })).status, 204);
    assert.equal((await call('GET', '/user')).body.email, 'sam@x.io', 'still signed in here');
    assert.equal((await laptop('GET', '/user')).body, null, 'other device signed out');
    assert.equal((await laptop('POST', '/auth/login', { email: 'sam@x.io', password: 'correct horse' })).status, 401);
    assert.equal((await laptop('POST', '/auth/login', { email: 'sam@x.io', password: 'new password 1' })).status, 200);
    assert.equal((await client()('POST', '/auth/password', { current_password: 'x', new_password: 'whatever12' })).status, 401);

    assert.deepEqual((await call('GET', '/health')).body, { ok: true, persistentStorage: null });
  } finally {
    server.close();
  }
});

test('API: task CRUD, delay logging, focus sessions, cascade delete', async () => {
  const { server, client } = await startServer();
  const call = client();
  try {
    await call('POST', '/auth/signup', { name: 'Sam', email: 'sam@x.io', password: 'password1' });

    const bad = await call('POST', '/tasks', { title: 'Essay', due_date: '2026-13-45', estimated_duration: 30 });
    assert.equal(bad.status, 400);

    const { status, body: task } = await call('POST', '/tasks', { title: ' Essay ', due_date: '2026-11-14', estimated_duration: 45 });
    assert.equal(status, 201);
    assert.equal(task.title, 'Essay');
    assert.equal(task.status, 'pending');
    assert.equal(task.completed_at, null);

    assert.equal((await call('POST', '/logs', { task_id: task.id, reason: 'Tiredness', note: 'late night' })).status, 201);
    assert.equal((await call('POST', '/logs', { task_id: task.id, reason: 'Bored' })).status, 400);
    assert.equal((await call('GET', '/tasks?status=delayed')).body.length, 1, 'logging marks task delayed');

    assert.ok((await call('PATCH', `/tasks/${task.id}`, { status: 'completed' })).body.completed_at);
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

test('users cannot see or change each other’s data', async () => {
  const { server, client } = await startServer();
  const alice = client();
  const bob = client();
  try {
    await alice('POST', '/auth/signup', { name: 'Alice', email: 'a@x.io', password: 'password1' });
    await bob('POST', '/auth/signup', { name: 'Bob', email: 'b@x.io', password: 'password2' });
    const { body: task } = await alice('POST', '/tasks', { title: 'Secret', due_date: '2026-11-14', estimated_duration: 10 });

    assert.equal((await bob('GET', '/tasks')).body.length, 0);
    assert.equal((await bob('PATCH', `/tasks/${task.id}`, { title: 'hacked' })).status, 404);
    assert.equal((await bob('DELETE', `/tasks/${task.id}`)).status, 404);
    assert.equal((await bob('POST', '/logs', { task_id: task.id, reason: 'Other' })).status, 400);
    const now = new Date().toISOString();
    assert.equal((await bob('POST', '/sessions', { task_id: task.id, start_time: now, end_time: now, duration: 1 })).status, 400);
    assert.equal((await alice('GET', '/tasks')).body[0].title, 'Secret');
  } finally {
    server.close();
  }
});

test('opening a database from before accounts adds the login columns', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'laterless-')), 'old.db');
  const old = new DatabaseSync(file);
  old.exec("CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT 'x'); INSERT INTO Users (name) VALUES ('Old');");
  old.close();
  const db = openDb(file);
  const cols = db.prepare('PRAGMA table_info(Users)').all().map((c) => c.name);
  assert.ok(cols.includes('email') && cols.includes('password_hash'));
  assert.equal(db.prepare('SELECT name FROM Users').get().name, 'Old', 'existing rows kept');
  db.close();
});
