import { openDb } from './db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3001;
// Express 5 passes listen errors (e.g. port already in use) to this callback instead of throwing.
createApp(openDb()).listen(port, (err) => {
  if (err) {
    console.error(
      err.code === 'EADDRINUSE'
        ? `Port ${port} is already in use — LaterLess (or another app) is probably already running. Stop it, or set a different PORT.`
        : err
    );
    process.exit(1);
  }
  console.log(`LaterLess API running on http://localhost:${port}`);
});
