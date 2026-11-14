// API client. Successful GET responses are stored in IndexedDB so the last-loaded
// tasks, sessions and logs can still be viewed offline. Changes require a connection:
// shortcut: no offline write queue/sync; add one (e.g. Workbox Background Sync) if offline editing is needed.

const STORE = 'responses';

function withStore(mode, fn) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('laterless', 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = fn(open.result.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}
const cacheGet = (key) => withStore('readonly', (s) => s.get(key));
const cachePut = (key, value) => withStore('readwrite', (s) => s.put(value, key));

/** Forget the cached data, so the next person on this device doesn't see it. */
export const clearCache = () => withStore('readwrite', (s) => s.clear()).catch(() => {});

export class ApiError extends Error {
  constructor(message, { offline = false, status } = {}) {
    super(message);
    this.offline = offline;
    this.status = status;
  }
}

async function request(path, method = 'GET', body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("You're offline. This change wasn't saved — try again when you're connected.", { offline: true });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || `Server error (${res.status}). Is the backend running?`, { status: res.status });
  return data;
}

async function getWithCache(path) {
  try {
    const data = await request(path);
    cachePut(path, data).catch(() => {}); // caching is best-effort
    return { data, offline: false };
  } catch (err) {
    if (!err.offline) throw err;
    const data = await cacheGet(path).catch(() => undefined);
    if (data === undefined) throw err;
    return { data, offline: true };
  }
}

export async function loadAll() {
  const user = await getWithCache('/user');
  if (!user.data) return { user: null, tasks: [], sessions: [], logs: [], offline: user.offline };
  const [tasks, sessions, logs] = await Promise.all(['/tasks', '/sessions', '/logs'].map(getWithCache));
  return {
    user: user.data,
    tasks: tasks.data,
    sessions: sessions.data,
    logs: logs.data,
    offline: [user, tasks, sessions, logs].some((r) => r.offline),
  };
}

export const api = {
  signup: (account) => request('/auth/signup', 'POST', account),
  login: (credentials) => request('/auth/login', 'POST', credentials),
  logout: () => request('/auth/logout', 'POST'),
  saveUser: (name) => request('/user', 'PUT', { name }),
  createTask: (task) => request('/tasks', 'POST', task),
  updateTask: (id, changes) => request(`/tasks/${id}`, 'PATCH', changes),
  deleteTask: (id) => request(`/tasks/${id}`, 'DELETE'),
  createSession: (session) => request('/sessions', 'POST', session),
  createLog: (log) => request('/logs', 'POST', log),
};
