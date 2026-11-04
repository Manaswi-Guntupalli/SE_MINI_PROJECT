import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const directory = resolve(process.argv[2]);
const assertions = ['server', 'client'].flatMap(suite => {
  const report = JSON.parse(readFileSync(join(directory, `${suite}-tests.json`), 'utf8'));
  return report.testResults.flatMap(file => file.assertionResults.map(test => ({ suite, name: test.fullName, status: test.status })));
});
const browser = JSON.parse(readFileSync(join(directory, 'browser.json'), 'utf8'));
function collect(suites) {
  for (const suite of suites) {
    for (const spec of suite.specs || []) assertions.push({ suite: 'browser', name: spec.title, status: spec.ok ? 'passed' : 'failed' });
    collect(suite.suites || []);
  }
}
collect(browser.suites);
// Executable selectors for the OEP-19 execution supplement, not blanket
// completion of the initial workbook's unexecuted candidate scenarios.
const mapping = {
  'FR-01': ['AC23-01', 'AC23-02', 'AC23-03', 'OEP44-ST-01'],
  'FR-02': ['AC24-01', 'AC24-02', 'AC51-01', 'OEP44-ST-01'],
  'FR-03': ['IT-EXAM-02', 'IT-EXAM-03', 'AC33-02'],
  'FR-04': ['IT-EXAM-05', 'IT-EXAM-06', 'AC34-02'],
  'FR-05': ['IT-MCQ-01', 'IT-MCQ-03', 'IT-MCQ-04'],
  'FR-06': ['AC35-01', 'AC35-02', 'UI-AC35'],
  'FR-07': ['IT-PUBLISH-01', 'IT-PUBLISH-02', 'IT-PUBLISH-03', 'IT-PUBLISH-04'],
  'FR-08': ['IT-EXAM-04', 'UI-EXAM-01', 'UI-EXAM-05'],
  'FR-09': ['AC36-01', 'AC38-LIST', 'AC38-STATES', 'OEP44-ST-01'],
  'FR-10': ['OEP44-IT-01', 'OEP44-SEC-01'],
  'FR-11': ['OEP44-IT-01', 'OEP44-IT-02', 'AC46-SYNC', 'AC46-CLOCK', 'AC46-EXPIRY'],
  'FR-12': ['OEP44-IT-01', 'OEP44-FAIL-01', 'AC40-ORDER', 'AC40-RETRY', 'OEP44-ST-01'],
  'FR-13': ['manual submission computes', 'OEP44-IT-02', 'AC47-DRAIN', 'AC47-EXPIRY', 'OEP44-ST-01'],
  'FR-14': ['OEP44-IT-02', 'OEP44-ST-02'],
  'FR-15': ['manual submission computes', 'full evaluation is idempotent', 'OEP44-ST-01'],
  'FR-16': ['AC24-04', 'empty, pending, evaluated', 'OEP44-ST-01'],
  'FR-17': ['AC24-03', 'empty, pending, evaluated', 'OEP44-ST-01'],
  'OEP-SR-001': ['AC23-01', 'AC51-03'],
  'OEP-SR-002': ['AC23-02', 'AC23-03', 'AC23-04'],
  'OEP-SR-003': ['AC24-01', 'AC24-02', 'AC51-02'],
  'OEP-SR-004': ['AC24-03', 'AC24-04', 'OEP44-SEC-01'],
  'OEP-SR-005': ['AC36-01', 'OEP44-IT-01'],
  'OEP-SR-006': ['AC33-02', 'AC35-01', 'AC51-01', 'OEP44-FAIL-01'],
};
const rows = Object.entries(mapping).map(([requirement, selectors]) => ({
  requirement,
  cases: selectors.map(selector => {
    const matches = assertions.filter(test => test.name.includes(selector));
    if (!matches.length || matches.some(test => test.status !== 'passed')) throw new Error(`Missing or failing executed mapping: ${requirement} / ${selector}`);
    return { selector, matches };
  }),
}));
writeFileSync(join(directory, 'traceability.json'), JSON.stringify({ status: 'passed', requirements: rows }, null, 2) + '\n');
console.log(`Verified executed test mappings for 17 functional and 6 security requirements.`);
