import { appendFileSync, existsSync, readFileSync } from 'node:fs';

let summary = '## Application CI\n\nRuns locked installs, backend syntax checks, frontend lint/build, real MongoDB API tests, React component tests, scoring units and real-browser acceptance workflows.\n\n';
const path = 'server/reports/sprint1-acceptance.json';
if (existsSync(path)) {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  summary += `**Release acceptance diagnostic: ${report.failed} failed; ${report.passed} passed.**\n\n`;
  summary += 'The diagnostic is advisory while the feature issues are incomplete. It does not grant release acceptance. Required build/test stages fail normally.\n\n';
  for (const item of report.results.filter((item) => item.status === 'FAIL')) {
    summary += `- ${item.id}: ${item.criterion}\n`;
  }
} else {
  summary += 'Acceptance diagnostics were not reached; inspect the failed stage and uploaded reports.\n';
}
summary += '\nSee docs/PERSISTENCE_ACCEPTANCE.md for the integrated acceptance mapping and docs/CI.md for commands/evidence. The original prototype review is historical.\n';
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
