import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectTestDatabase, closeTestDatabase } from '../server/test/database.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(new URL('../server/package.json', import.meta.url));
const request = require('supertest');
const app = require('./app');
const Exam = require('./models/Exam');
const results = [];
const examData = (extra = {}) => ({ title: 'Audit quiz', instructorId: 'owner-a',
  startTime: '2026-10-24T12:00:00.000Z', duration: 30, ...extra });
const question = { questionText: '2 + 2?', options: [
  { text: '4', isCorrect: true }, { text: '5', isCorrect: false },
] };
function record(id, issues, criterion, expected, actual, passed) {
  results.push({ id, issues, criterion, expected, actual, status: passed ? 'PASS' : 'FAIL' });
}

try {
  await connectTestDatabase();
  let response = await request(app).post('/api/exams').send(examData());
  record('AC-AUTH-01', [23, 24, 33], 'Anonymous exam creation must be rejected',
    '401 or 403', response.status, [401, 403].includes(response.status));

  const seeded = await Exam.create(examData({ questions: [question] }));
  response = await request(app).get(`/api/exams/${seeded.id}`);
  record('AC-AUTH-02', [24, 35, 37], 'Anonymous access must not disclose management data/answer keys',
    '401 or 403 with no answer key', {
      status: response.status,
      returnedCorrectAnswerFlags: response.body.questions?.some((q) => q.options?.some((o) => o.isCorrect)) || false,
    }, [401, 403].includes(response.status));

  response = await request(app).put(`/api/exams/${seeded.id}`).send({ title: 'Anonymous overwrite' });
  record('AC-AUTH-03', [24, 34], 'Anonymous exam edits must be rejected',
    '401 or 403', response.status, [401, 403].includes(response.status));

  response = await request(app).put(`/api/exams/${seeded.id}`).send({ instructorId: 'attacker-controlled-owner' });
  const owner = (await Exam.findById(seeded.id)).instructorId;
  record('AC-OWNER-01', [33, 34], 'Exam management must preserve the authenticated owner',
    'owner-a', { status: response.status, persistedOwner: owner }, owner === 'owner-a');

  const incomplete = await Exam.create(examData());
  response = await request(app).put(`/api/exams/${incomplete.id}`).send({ status: 'Published' });
  const bypassed = await Exam.findById(incomplete.id);
  record('AC-PUBLISH-01', [34, 36], 'Draft updates must not bypass publication validation',
    'empty exam remains Draft', { status: response.status, persistedStatus: bypassed.status,
      questionCount: bypassed.questions.length }, bypassed.status === 'Draft');

  const withoutStart = examData();
  delete withoutStart.startTime;
  response = await request(app).post('/api/exams').send(withoutStart);
  record('AC-VALIDATION-01', [33], 'The existing prototype must accept the specified optional start time',
    '201 using a valid title/duration', { status: response.status, message: response.body.message }, response.status === 201);

  response = await request(app).post('/api/exams').send(examData({ duration: 'Infinity' }));
  record('AC-VALIDATION-02', [33, 34, 36], 'Duration must be finite',
    '400', response.status, response.status === 400);

  response = await request(app).post('/api/exams').send(examData({ title: ' ' }));
  record('AC-VALIDATION-03', [33], 'Blank exam titles must be rejected', '400', response.status, response.status === 400);

  const empty = await Exam.create(examData());
  response = await request(app).post(`/api/exams/${empty.id}/publish`);
  record('AC-PUBLISH-02', [36], 'The publish endpoint must reject an empty draft', '400', response.status, response.status === 400);

  response = await request(app).post(`/api/exams/${empty.id}/questions`).send({
    ...question, options: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: true }],
  });
  record('AC-MCQ-01', [35], 'Question creation must reject multiple correct options', '400', response.status, response.status === 400);
} finally {
  await closeTestDatabase();
}

const report = {
  scope: 'Executable probes of the current prototype; authenticated flows cannot be accepted until #23/#24 exist.',
  generatedAt: new Date().toISOString(),
  passed: results.filter((r) => r.status === 'PASS').length,
  failed: results.filter((r) => r.status === 'FAIL').length,
  results,
};
mkdirSync(join(root, 'server', 'reports'), { recursive: true });
writeFileSync(join(root, 'server', 'reports', 'sprint1-acceptance.json'), JSON.stringify(report, null, 2) + '\n');
for (const result of results) console.log(`${result.status} ${result.id}: ${result.criterion} (actual ${JSON.stringify(result.actual)})`);
console.log(`Acceptance diagnostic: ${report.passed} passed; ${report.failed} failed.`);
// CI explicitly requests a diagnostic artifact while feature issues are still
// incomplete. The standalone audit command exits nonzero for failed criteria.
if (report.failed && !process.argv.includes('--report-only')) process.exitCode = 1;
