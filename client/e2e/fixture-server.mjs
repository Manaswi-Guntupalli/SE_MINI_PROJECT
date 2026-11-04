// Disposable local test infrastructure; never reads .env or a team MONGO_URI.
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { connectTestDatabase, closeTestDatabase } from '../../server/test/database.mjs';
const require = createRequire(new URL('../../server/package.json', import.meta.url));
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'oep44-isolated-browser-test-session-secret';
process.env.CLIENT_ORIGIN = 'http://127.0.0.1:4173';
process.env.VITE_API_URL = 'http://127.0.0.1:5011/api';
const uri = await connectTestDatabase();
mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
// Test-process connection only; generated/ignored and never an application URI.
const connectionFile = new URL('../reports/browser-fixture.json', import.meta.url);
writeFileSync(connectionFile, JSON.stringify({ uri }));
const User = require('./models/User');
await Promise.all(['User', 'Exam', 'Attempt', 'Response', 'Result'].map(name => require(`./models/${name}`).init()));
const passwordHash = await require('bcryptjs').hash('BrowserTest123!', 4);
for (const role of ['Instructor', 'Student', 'Admin']) {
  await User.create({ name: `Browser ${role}`, email: `${role.toLowerCase()}@browser.invalid`, role, passwordHash });
}
await User.create({ name: 'Other Student', email: 'other@browser.invalid', role: 'Student', passwordHash });
const worker = require('./services/evaluationWorker').startEvaluationWorker({ intervalMs: 100 });
const listener = require('./app').listen(5011, '127.0.0.1');
const vite = await createServer({ server: { host: '127.0.0.1', port: 4173, strictPort: true } });
await vite.listen();
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  worker.stop();
  await vite.close();
  await new Promise(resolve => listener.close(resolve));
  await closeTestDatabase();
  rmSync(connectionFile, { force: true });
}
process.on('SIGTERM', () => { void stop().finally(() => process.exit()); });
process.on('SIGINT', () => { void stop().finally(() => process.exit()); });
