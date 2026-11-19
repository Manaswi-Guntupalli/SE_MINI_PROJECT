import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Do not resolve executables through a caller-controlled PATH or working directory.
export function gitOutput(args, options = {}) {
  const configured = process.env.GIT_BINARY;
  if (configured && !isAbsolute(configured)) throw new Error('GIT_BINARY must be an absolute path');
  const candidates = configured ? [configured] : process.platform === 'win32'
    ? ['C:\\Program Files\\Git\\cmd\\git.exe', 'C:\\Program Files\\Git\\bin\\git.exe']
    : ['/usr/bin/git', '/usr/local/bin/git', '/opt/homebrew/bin/git'];
  const executable = candidates.find(path => existsSync(path));
  if (!executable) throw new Error('Git was not found in a standard installation. Set GIT_BINARY to its trusted absolute path.');
  return execFileSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, ...options });
}
