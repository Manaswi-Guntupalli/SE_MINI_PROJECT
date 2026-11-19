import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reports = ['client', 'server'].map(part => {
  const suite = join(root, part);
  return readFileSync(join(suite, 'coverage', 'lcov.info'), 'utf8').replace(/^SF:(.+)$/gm, (_, filename) => {
    const source = relative(suite, resolve(suite, filename.trim()));
    if (source === '..' || source.startsWith(`..${sep}`) || isAbsolute(source)) throw new Error('Coverage source leaves its suite');
    return `SF:${part}/${source.split(sep).join('/')}`;
  });
});
const output = join(root, 'ci-evidence', 'sonar');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'lcov.info'), reports.join('\n'));
console.log('Prepared repository-relative frontend and backend LCOV for SonarQube Cloud.');
