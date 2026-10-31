import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const coverage = {};
for (const part of ['client', 'server']) {
  const xml = readFileSync(join(root, part, 'reports', 'junit.xml'), 'utf8');
  const header = xml.match(/<testsuites\b[^>]*>/)?.[0];
  if (!header || !/\btests="[1-9]\d*"/.test(header) || !/\bfailures="0"/.test(header)
      || !/\berrors="0"/.test(header)) {
    throw new Error(`${part}: missing, empty or failing JUnit report`);
  }
  coverage[part] = JSON.parse(readFileSync(join(root, part, 'coverage', 'coverage-summary.json'), 'utf8')).total;
}
if (!existsSync(join(root, 'client', 'dist', 'index.html'))) throw new Error('Frontend build artifact is missing');
const audit = JSON.parse(readFileSync(join(root, 'server', 'reports', 'sprint1-acceptance.json'), 'utf8'));
const browser = JSON.parse(readFileSync(join(root, 'client', 'reports', 'browser.json'), 'utf8'));
if (!browser.stats.expected || browser.stats.unexpected || browser.stats.skipped || browser.stats.flaky) {
  throw new Error('Browser acceptance report is missing clean passing tests');
}
const evidence = {
  generatedAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  node: process.version, platform: process.platform, arch: process.arch,
  run: process.env.GITHUB_RUN_ID || 'local',
  lockfiles: Object.fromEntries(['client', 'server'].map((part) => [part,
    createHash('sha256').update(readFileSync(join(root, part, 'package-lock.json'))).digest('hex')])),
  coverage,
  browserTests: browser.stats.expected,
  releaseAcceptance: { passed: audit.passed, failed: audit.failed, diagnosticPassed: audit.failed === 0,
    formalAcceptance: 'Requires independent review, team agreement and remaining Release 1 feature acceptance' },
  scope: 'Integrated authentication, roles, Admin, authoring, Student attempts/submission, worker expiry and scoring/results suites, including real-browser workflows. Automated results do not replace human review or deployment acceptance.',
};
mkdirSync(join(root, 'ci-evidence'), { recursive: true });
writeFileSync(join(root, 'ci-evidence', 'run.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(`Build/test evidence saved. Release acceptance: ${audit.failed} diagnostic failures remain.`);
