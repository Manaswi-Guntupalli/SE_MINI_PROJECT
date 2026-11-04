import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// Change a real expectation in a temporary test file, run the real test runner,
// and require that exact test to be reported as failing. Never modifies source.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverRoot = join(root, 'server');
const report = join(root, 'server', 'reports', 'negative-control.json');
const log = join(root, 'server', 'reports', 'negative-control.log');
if (process.argv.includes('--help')) {
  console.log('Runs a temporary real Exam schema assertion with a deliberately wrong expected value.');
  process.exit(0);
}
mkdirSync(dirname(report), { recursive: true });
// Keep the negative test outside test/** so an interrupted proof can never
// contaminate the normal application suites on the next run.
const temporary = mkdtempSync(join(serverRoot, '.ci-negative-'));
const testFile = join(temporary, 'check.test.mjs');
const config = join(temporary, 'vitest.config.mjs');
const title = 'CI negative control: a new exam is deliberately expected to be Published';
writeFileSync(testFile, `import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
const Exam = createRequire(import.meta.url)('../models/Exam');
it(${JSON.stringify(title)}, () => { expect(new Exam().status).toBe('Published'); });
`);
writeFileSync(config, `export default { test: { include: [${JSON.stringify(relative(serverRoot, testFile).split(sep).join('/'))}] } };\n`);
rmSync(report, { force: true });
try {
  const runner = join(root, 'server', 'node_modules', 'vitest', 'vitest.mjs');
  const result = spawnSync(process.execPath, [runner, 'run', '--config', config,
    '--reporter=json', `--outputFile=${report}`], {
    cwd: join(root, 'server'), encoding: 'utf8', timeout: 120000,
  });
  writeFileSync(log, (result.stdout || '') + (result.stderr || ''));
  if (result.error) throw result.error;
  const output = JSON.parse(readFileSync(report, 'utf8'));
  const assertions = output.testResults.flatMap((suite) => suite.assertionResults || []);
  const expected = assertions.find((assertion) => assertion.fullName === title);
  if (result.status === 0 || expected?.status !== 'failed' || output.numFailedTests !== 1) {
    throw new Error('Failure detection was not proven by the expected assertion. Inspect negative-control.log.');
  }
  console.log('Verified: the real test runner returned a nonzero exit code for the deliberately wrong Exam assertion.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
if (process.argv.includes('--propagate')) {
  console.error('Intentional pipeline failure: propagating the verified failing test.');
  process.exitCode = 1;
}
