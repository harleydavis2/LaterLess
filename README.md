# LaterLess – Procrastination Tracker (PWA)

A small mobile-first web app for students: plan daily tasks, time focused work, log **why** you delay tasks, and see weekly statistics.

**Stack:** React + Vite + Tailwind CSS + Lucide + Recharts · Node.js + Express · SQLite (Node's built-in `node:sqlite`) · vite-plugin-pwa (Workbox).

## Run it

Requires **Node.js 22.13 or newer** (uses the built-in SQLite module, so nothing native has to compile).

```bash
npm run install:all
```

**Demo / production mode** (one server, PWA installable, works offline):

```bash
npm run build
```

```bash
npm start
```

Open http://localhost:3001.

**Development mode** (hot reload), in two terminals:

```bash
npm --prefix backend run dev
```

```bash
npm --prefix frontend run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend. The service worker is only active in the production build.

**Tests:** `npm test` runs the backend API test and the statistics unit tests.

**Config** (optional `backend/.env`, see `.env.example`): `PORT` (default 3001) and `DB_PATH` (default `backend/data/laterless.db`). The frontend's dev proxy target can be changed with `API_URL`.

## Folder structure

```
backend/
  src/schema.sql        database tables, foreign keys, CHECK constraints
  src/db.js             opens SQLite and applies the schema
  src/app.js            Express app: mounts routes, JSON errors, serves frontend/dist
  src/routes/           user.js, tasks.js, sessions.js, logs.js
  test/api.test.js      end-to-end API test (in-memory DB)
frontend/
  src/api.js            fetch wrapper + IndexedDB cache of the last loaded data
  src/App.jsx           data loading, tab routing (#/home …), shared modals, context
  src/lib/stats.js      all dashboard/insight statistics (pure functions, unit-tested)
  src/pages/            Home, Tasks, Focus, Insights, Welcome
  src/components/       TaskCard, TaskForm, DelayForm, Modal, ConfirmDialog, Charts, States …
  vite.config.js        PWA manifest + service worker config
```

## Database

| Table | Columns |
|---|---|
| Users | id, name, created_at |
| Tasks | id, user_id → Users, title, description, due_date (YYYY-MM-DD), estimated_duration (minutes), status (pending / in_progress / completed / delayed), created_at, completed_at |
| FocusSessions | id, task_id → Tasks, start_time, end_time, duration (seconds worked, pauses excluded) |
| ProcrastinationLogs | id, task_id → Tasks, reason (one of 6 fixed reasons), note, created_at |

Deleting a task deletes its sessions and logs (`ON DELETE CASCADE`). There is one local profile and no login, by design.

## API

| Method | Path | Purpose |
|---|---|---|
| GET / PUT | `/api/user` | read / create-or-rename the profile |
| GET | `/api/tasks?status=` | list tasks (optional status filter) |
| POST | `/api/tasks` | create a task |
| PATCH | `/api/tasks/:id` | update any fields (sets `completed_at` automatically) |
| DELETE | `/api/tasks/:id` | delete a task |
| GET / POST | `/api/sessions` | list / save focus sessions |
| GET / POST | `/api/logs` | procrastination history / log a delay (also marks the task Delayed) |

All input is validated on the server; errors come back as `{ "error": "message" }` with status 400 or 404.

## How the main features work

- **Procrastination logging:** "Delay" on any open task opens a sheet with the 6 reasons and an optional note. Insights shows the most common reason, a breakdown, and the full delay history.
- **Focus timer:** a stopwatch tied to one task. Its state is kept in `localStorage` as timestamps, so refreshing or closing the page doesn't lose time. If saving fails (e.g. offline), the time stays on the timer so it can be saved later.
- **Statistics:** nothing is hard-coded. Everything is calculated from the real tasks, sessions and logs in `src/lib/stats.js`, in the user's local timezone.

## Offline support (what it does and doesn't do)

- The app shell (HTML, JS, CSS, icons) is precached by the service worker, so the app opens without a connection after the first visit.
- The last successfully loaded user, tasks, sessions and logs are stored in **IndexedDB**. Offline, the app shows that data with an "offline" banner.
- If there's no connection and nothing cached yet, an offline fallback screen is shown.
- **Changes need a connection.** Creating, editing or logging while offline shows a clear error and nothing is saved. There is **no offline sync**.
