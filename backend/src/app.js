import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import userRoutes from './routes/user.js';
import taskRoutes from './routes/tasks.js';
import sessionRoutes from './routes/sessions.js';
import logRoutes from './routes/logs.js';

const DIST = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '20kb' }));

  app.use('/api/user', userRoutes(db));
  app.use('/api/tasks', taskRoutes(db));
  app.use('/api/sessions', sessionRoutes(db));
  app.use('/api/logs', logRoutes(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // After `npm run build` in frontend/, serve the PWA from the same origin.
  if (existsSync(DIST)) {
    app.use(express.static(DIST));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile('index.html', { root: DIST }) : next()));
  }

  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server' : err.message });
  });

  return app;
}
