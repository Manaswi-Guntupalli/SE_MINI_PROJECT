import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// OEP-44 evidence collector. Every result below comes from a real subprocess.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use Node 24 from .node-version for Release 1 evidence.');
const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const output = join(root, 'docs', 'evidence', `oep44-${day}`);
mkdirSync(output, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .trim().split(/\r?\n/).filter(path => !path.startsWith('docs/') && /\.(?:m?js|jsx|json|ya?ml)$|^\.node-version$/.test(path));
const manifest = {
  task: 'OEP-44 / #53', startedAt: new Date().toISOString(), node: process.version,
  platform: `${process.platform}/${process.arch}`, timezone: 'Asia/Kolkata',
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceFiles: Object.fromEntries(files.map(path => [path, hash(readFileSync(join(root, path)))])),
  scope: 'Functional and security acceptance, real Edge/Chromium browser, isolated MongoDB 8.0.17. No production/load/multi-browser certification.',
  stages: [], status: 'running',
};
const save = () => writeFileSync(join(output, 'execution.json'), JSON.stringify(manifest, null, 2) + '\n');
save();
function stage(id, cwd, args) {
  console.log(`OEP-44: ${id}`);
  const startedAt = new Date().toISOString();
  const run = spawnSync(process.execPath, args, { cwd: join(root, cwd), encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
  const log = `${id}-output.txt`;
  writeFileSync(join(output, log), (run.stdout || '') + (run.stderr || '') + (run.error ? String(run.error) : ''));
  manifest.stages.push({ id, cwd, command: ['node', ...args], startedAt, finishedAt: new Date().toISOString(), exitCode: run.status, log });
  save();
  if (run.error || run.status !== 0) throw new Error(`${id} failed; inspect ${relative(root, join(output, log))}`);
}
try {
  for (const path of ['server/reports/oep44-tests.json', 'client/reports/oep44-tests.json', 'client/reports/browser.json']) rmSync(join(root, path), { force: true });
  const vitest = ['node_modules/vitest/vitest.mjs', 'run', '--coverage', '--reporter=default', '--reporter=json', '--reporter=junit', '--outputFile.json=reports/oep44-tests.json', '--outputFile.junit=reports/junit.xml'];
  stage('server', 'server', vitest);
  stage('scoring', 'server', ['--test', 'tests/evaluationService.test.js']);
  stage('client', 'client', vitest);
  stage('browser', 'client', ['node_modules/@playwright/test/cli.js', 'test']);
  stage('lint', 'client', ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings=0']);
  stage('build', 'client', ['node_modules/vite/bin/vite.js', 'build']);
  stage('syntax', '.', ['scripts/check-server-syntax.mjs']);
  stage('negative-control', '.', ['scripts/verify-test-failure.mjs']);
  for (const app of ['server', 'client']) {
    for (const [source, target] of [['reports/oep44-tests.json', 'tests.json'], ['reports/junit.xml', 'junit.xml'], ['coverage/coverage-summary.json', 'coverage.json']]) {
      copyFileSync(join(root, app, source), join(output, `${app}-${target}`));
    }
    const report = JSON.parse(readFileSync(join(output, `${app}-tests.json`), 'utf8'));
    if (!report.success || report.numFailedTests || report.numPendingTests) throw new Error(`${app} has failures or skipped tests`);
    manifest[`${app}Tests`] = report.numPassedTests;
  }
  copyFileSync(join(root, 'client/reports/browser.json'), join(output, 'browser.json'));
  copyFileSync(join(root, 'client/reports/browser-junit.xml'), join(output, 'browser-junit.xml'));
  copyFileSync(join(root, 'server/reports/negative-control.json'), join(output, 'negative-control.json'));
  const browser = JSON.parse(readFileSync(join(output, 'browser.json'), 'utf8'));
  if (browser.stats.unexpected || browser.stats.skipped || browser.stats.flaky || !browser.stats.expected) throw new Error('Browser report is not a clean pass');
  manifest.browserTests = browser.stats.expected;
  stage('traceability', '.', ['scripts/check-release1-traceability.mjs', relative(root, output)]);
  const coverage = JSON.parse(readFileSync(join(output, 'server-coverage.json'), 'utf8'));
  manifest.backendLineCoverage = coverage.total.lines.pct;
  if (manifest.backendLineCoverage < 70) throw new Error('Backend line coverage is below the Release 1 70% target');
  const artifacts = join(root, 'client/reports/browser-artifacts');
  for (const entry of readdirSync(artifacts, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const screenshot = join(artifacts, entry.name, 'release1-admin.png');
    if (existsSync(screenshot)) copyFileSync(screenshot, join(output, 'browser-admin.png'));
  }
  for (const [path, digest] of Object.entries(manifest.sourceFiles)) {
    if (hash(readFileSync(join(root, path))) !== digest) throw new Error(`Source changed during verification: ${path}`);
  }
  manifest.status = 'passed';
} catch (error) {
  manifest.status = 'failed';
  manifest.error = String(error);
  process.exitCode = 1;
} finally {
  manifest.finishedAt = new Date().toISOString();
  save();
  console.log(`OEP-44 ${manifest.status}: ${relative(root, join(output, 'execution.json'))}`);
}
