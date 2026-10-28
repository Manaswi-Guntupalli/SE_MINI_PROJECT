const { spawn } = require('node:child_process');
const { mkdirSync, readdirSync, existsSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { MongoClient } = require('mongoose').mongo;

// Dedicated data and port: never changes the installed MongoDB Windows service.
const port = 27018;
const root = resolve(__dirname, '..', '.local-mongodb');
mkdirSync(root, { recursive: true });
let binary = process.env.MONGOD_BINARY || 'mongod';
if (!process.env.MONGOD_BINARY && process.platform === 'win32') {
  const installation = join(process.env.ProgramFiles || 'C:\\Program Files', 'MongoDB', 'Server');
  if (existsSync(installation)) {
    const versions = readdirSync(installation).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    const candidate = versions.map(version => join(installation, version, 'bin', 'mongod.exe')).find(existsSync);
    if (candidate) binary = candidate;
  }
}
const child = spawn(binary, ['--dbpath', root, '--port', String(port), '--bind_ip', '127.0.0.1',
  '--replSet', 'oep-dev', '--logpath', join(root, 'mongod.log'), '--logappend'], { stdio: 'inherit', windowsHide: true });
let stopping = false;
function stop() { stopping = true; child.kill('SIGTERM'); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('error', error => { stopping = true; console.error(`Cannot start mongod: ${error.message}. Install MongoDB or set MONGOD_BINARY.`); process.exitCode = 1; });
child.on('exit', code => {
  if (!stopping) { console.error(`mongod exited (${code}). Check ${join(root, 'mongod.log')}; port ${port} may already be in use.`); process.exitCode = code || 1; }
});

(async () => {
  for (let retry = 0; retry < 30 && child.exitCode === null && !stopping; retry++) {
    const client = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 1000 });
    try {
      await client.connect();
      const admin = client.db('admin');
      try { await admin.command({ replSetGetStatus: 1 }); }
      catch (error) {
        if (error.code !== 94) throw error;
        await admin.command({ replSetInitiate: { _id: 'oep-dev', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
      }
      const hello = await admin.command({ hello: 1 });
      if (hello.setName !== 'oep-dev') throw new Error('Unexpected replica set name');
      if (hello.isWritablePrimary) {
        console.log(`Development MongoDB ready: mongodb://127.0.0.1:${port}/online_exam_portal?replicaSet=oep-dev`);
        console.log('Keep this terminal running. Data persists in server/.local-mongodb; Ctrl+C stops only this database.');
        return;
      }
    } catch (error) {
      if (retry === 29) { console.error(`Database startup failed: ${error.message}`); process.exitCode = 1; stop(); }
    } finally { await client.close(); }
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  if (!stopping && child.exitCode === null) { console.error('Replica set did not become primary in time. Inspect the database log.'); process.exitCode = 1; stop(); }
})();
