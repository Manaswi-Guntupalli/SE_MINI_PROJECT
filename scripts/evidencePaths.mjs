import { existsSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function evidenceDirectory(argument) {
  if (typeof argument !== 'string' || !argument) throw new Error('Provide a report directory inside docs/evidence');
  const base = realpathSync(join(root, 'docs', 'evidence'));
  const requested = resolve(root, argument);
  // Select an existing report folder from a filesystem allowlist. Never pass the
  // command-line path itself to a read/write API, even after normalizing it.
  const candidates = readdirSync(base, { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => join(base, entry.name));
  const selected = candidates.find(candidate => process.platform === 'win32'
    ? candidate.toLowerCase() === requested.toLowerCase() : candidate === requested);
  if (!selected) throw new Error('Choose an existing report folder directly inside docs/evidence');
  const directory = realpathSync(selected);
  const location = relative(base, directory);
  if (location === '..' || location.startsWith(`..${sep}`) || isAbsolute(location)) {
    throw new Error('Report directory must stay inside docs/evidence, including symbolic-link targets');
  }
  return directory;
}

export function evidenceFile(directory, filename) {
  if (!['server-tests.json', 'client-tests.json', 'browser.json', 'traceability.json'].includes(filename)) {
    throw new Error('Unsupported evidence filename');
  }
  const path = join(directory, filename);
  // Reject a dangling link as well as a link to an existing external file.
  try {
    if (lstatSync(path).isSymbolicLink()) throw new Error('Evidence files must not be symbolic links');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existsSync(path) && dirname(realpathSync(path)) !== directory) throw new Error('Evidence file leaves the report directory');
  return path;
}
