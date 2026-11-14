import { openDb } from './db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3001;
createApp(openDb()).listen(port, () => console.log(`LaterLess API running on http://localhost:${port}`));
