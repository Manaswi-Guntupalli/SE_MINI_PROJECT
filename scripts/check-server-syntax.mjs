import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const server = join(dirname(fileURLToPath(import.meta.url)), '..', 'server');
const roots = ['server.js', 'app.js', 'controllers', 'models', 'routes'];
function check(path) {
  if (!path.endsWith('.js')) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory() || entry.name.endsWith('.js')) check(join(path, entry.name));
    }
    return;
  }
  const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const root of roots) check(join(server, root));
console.log('Backend JavaScript syntax checks passed (no transpilation required).');
