process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || 'audit-only-session-secret';

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectTestDatabase, closeTestDatabase } from '../server/test/database.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(new URL('../server/package.json', import.meta.url));
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('./app');
const Exam = require('./models/Exam');
const results = [];
const ownerId = new mongoose.Types.ObjectId();
const examData = (extra = {}) => ({
  title: 'Audit quiz',
  instructorId: ownerId,
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
  record(
    'AC-OWNER-01',
    [33, 34],
    'Exam management must preserve the stored owner when an anonymous overwrite is rejected',
    ownerId.toString(),
    {
      status: response.status,
      persistedOwner: owner.toString(),
    },
    owner.toString() === ownerId.toString()
  );

  const incomplete = await Exam.create(examData());
  response = await request(app).put(`/api/exams/${incomplete.id}`).send({ status: 'Published' });
  const bypassed = await Exam.findById(incomplete.id);
  record('AC-PUBLISH-01', [34, 36], 'Draft updates must not bypass publication validation',
    'empty exam remains Draft', { status: response.status, persistedStatus: bypassed.status,
      questionCount: bypassed.questions.length }, bypassed.status === 'Draft');

  const withoutStart = examData();
  delete withoutStart.startTime;
  response = await request(app).post('/api/exams').send(withoutStart);
  record(
    'AC-VALIDATION-01',
    [23, 33],
    'Anonymous requests must be authenticated before exam creation validation',
    '401',
    { status: response.status, message: response.body.message },
    response.status === 401
  );

  response = await request(app)
    .post('/api/exams')
    .send(examData({ duration: 'Infinity' }));
  record(
    'AC-VALIDATION-02',
    [23, 33, 34, 36],
    'Anonymous requests must be authenticated before duration validation',
    '401',
    response.status,
    response.status === 401
  );

  response = await request(app)
    .post('/api/exams')
    .send(examData({ title: ' ' }));
  record(
    'AC-VALIDATION-03',
    [23, 33],
    'Anonymous requests must be authenticated before title validation',
    '401',
    response.status,
    response.status === 401
  );

  const empty = await Exam.create(examData());
  response = await request(app)
    .post(`/api/exams/${empty.id}/publish`);
  record(
    'AC-PUBLISH-02',
    [23, 36],
    'Anonymous requests must not publish draft exams',
    '401',
    response.status,
    response.status === 401
  );

  response = await request(app)
    .post(`/api/exams/${empty.id}/questions`)
    .send({
      ...question,
      options: [
        { text: '4', isCorrect: true },
        { text: '5', isCorrect: true },
      ],
    });
  record(
    'AC-MCQ-01',
    [23, 35],
    'Anonymous requests must not create or modify exam questions',
    '401',
    response.status,
    response.status === 401
  );
} finally {
  await closeTestDatabase();
}

const report = {
  scope: 'Executable Sprint 1 acceptance probes for authentication, authorization, ownership and exam-management security.',  generatedAt: new Date().toISOString(),
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
