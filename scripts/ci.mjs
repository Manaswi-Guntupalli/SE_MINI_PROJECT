import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args, shell = false) {
  const result = shell
    ? spawnSync(command, { cwd: root, stdio: 'inherit', shell: true })
    : spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
// All shell command strings are fixed here. No user input is interpolated.
const npm = (command) => run(command, [], true);
const script = (name, args = []) => run(process.execPath, [join(root, 'scripts', name), ...args]);
const stages = {
  preflight() {
    if (Number(process.versions.node.split('.')[0]) !== 24) {
      throw new Error(`Node 24 is required; found ${process.version}. Use the version in .node-version.`);
    }
    console.log(`Node ${process.version}; ${process.platform}/${process.arch}`);
    npm('npm --version');
    run('git', ['rev-parse', 'HEAD']);
    // A failed stage must never archive success metadata from an earlier run.
    // These are generated CI outputs only; retained workflow artifacts and
    // committed docs/evidence records are outside these paths.
    for (const output of ['client/reports', 'server/reports', 'ci-evidence',
      'client/coverage', 'server/coverage', 'client/dist']) {
      rmSync(join(root, output), { recursive: true, force: true });
    }
    console.log('Cleared generated reports, coverage, manifest and frontend build before this CI run.');
  },
  install() {
    npm('npm ci --prefix server --no-audit --no-fund');
    npm('npm ci --prefix client --no-audit --no-fund');
  },
  build() {
    npm('npm run build --prefix server');
    npm('npm run lint --prefix client');
    npm('npm run build --prefix client');
  },
  test() {
    npm('npm run test:ci --prefix server');
    npm('npm run test:ci --prefix client');
    npm('npm run test:scoring --prefix server');
  },
  browser() { npm('npm run test:browser --prefix client'); },
  'verify-failure'() { script('verify-test-failure.mjs'); },
  'verify-failure-propagate'() { script('verify-test-failure.mjs', ['--propagate']); },
  'acceptance-report'() { script('audit-sprint1.mjs', ['--report-only']); },
  evidence() { script('write-ci-evidence.mjs'); },
};
const selected = process.argv[2];
if (selected === 'all') {
  for (const stage of ['preflight', 'install', 'build', 'test', 'browser', 'verify-failure', 'acceptance-report', 'evidence']) stages[stage]();
} else if (Object.hasOwn(stages, selected)) {
  stages[selected]();
} else {
  console.error(`Usage: node scripts/ci.mjs <all|${Object.keys(stages).join('|')}>`);
  process.exitCode = 2;
}
