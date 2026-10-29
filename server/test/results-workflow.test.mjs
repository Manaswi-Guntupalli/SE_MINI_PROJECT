import { createRequire } from 'node:module';
import { beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';
import request from 'supertest';
import { connectTestDatabase, closeTestDatabase } from './database.mjs';
const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Response = require('../models/Response');
const Result = require('../models/Result');
const { startAttempt, saveResponse, finalizeAttempt } = require('../services/persistenceService');
const { evaluateSubmittedAttempt } = require('../services/evaluationService');
const { processPendingEvaluations, startEvaluationWorker } = require('../services/evaluationWorker');
const bcrypt = require('bcryptjs');
let student, other, instructor, foreign, exam, attempt, passwordHash;
const password = 'ResultsTest123!';
beforeAll(async () => {
  await connectTestDatabase();
  await Promise.all([User.init(), Exam.init(), Attempt.init(), Response.init(), Result.init()]);
  passwordHash = await bcrypt.hash(password, 4);
});
afterAll(closeTestDatabase);
beforeEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([User.deleteMany({}), Exam.deleteMany({}), Attempt.deleteMany({}), Response.deleteMany({}), Result.deleteMany({})]);
  [student, other, instructor, foreign] = await User.create(['Student', 'Student', 'Instructor', 'Instructor'].map((role, index) => ({
    name: `Person ${index}`, email: `${index}@results.invalid`, passwordHash, role,
  })));
  exam = await Exam.create({ title: 'Results quiz', instructorId: instructor._id, duration: 30, status: 'Published',
    questions: [1, 2, 3].map(n => ({ questionText: `Question ${n}`, options: [{ text: 'Correct', isCorrect: true }, { text: 'Wrong' }] })),
  });
  ({ attempt } = await startAttempt({ studentId: student._id, examId: exam._id }));
});
async function login(user) {
  const agent = request.agent(app);
  expect((await agent.post('/api/auth/login').send({ email: user.email, password })).status).toBe(200);
  const token = (await agent.get('/api/auth/csrf-token')).body.csrfToken;
  return { agent, token };
}
async function select(index, option = 0) {
  const question = exam.questions[index];
  await saveResponse({ attemptId: attempt._id, studentId: student._id, questionId: question._id, selectedOptionId: question.options[option]._id });
}

it.each(['correct', 'wrong', 'mixed', 'unanswered'])('OEP-39: manual submission computes %s from saved answers, ignores supplied marks and survives reload', async kind => {
  if (kind === 'correct' || kind === 'wrong') for (let i = 0; i < 3; i++) await select(i, kind === 'correct' ? 0 : 1);
  if (kind === 'mixed') { await select(0); await select(1, 1); }
  const { agent, token } = await login(student);
  const response = await agent.post(`/api/student/attempts/${attempt.id}/submit`).set('X-CSRF-Token', token)
    .send({ score: 999, maximum: 999, isCorrect: true });
  expect(response.status).toBe(200);
  expect(response.body.result).toMatchObject({ score: kind === 'correct' ? 3 : kind === 'mixed' ? 1 : 0, maximum: 3, status: 'Evaluated' });
  const result = (await agent.get(`/api/student/results/${response.body.result._id}`)).body;
  expect(result).toMatchObject({ ...response.body.result, examTitle: exam.title });
  expect(JSON.stringify(result)).not.toContain('isCorrect');
});

it('OEP-39: running worker finalizes and evaluates timeout without a browser; active attempts remain untouched', async () => {
  await select(0);
  await expect(evaluateSubmittedAttempt({ attemptId: attempt._id, studentId: student._id })).rejects.toMatchObject({ status: 409 });
  await Attempt.collection.updateOne({ _id: attempt._id }, { $set: { startedAt: new Date(Date.now() - 120000), deadline: new Date(Date.now() - 60000) } });
  const active = (await startAttempt({ studentId: other._id, examId: exam._id })).attempt;
  const worker = startEvaluationWorker();
  try { await worker.done; } finally { worker.stop(); }
  expect(await Result.findOne({ attemptId: attempt._id })).toMatchObject({ score: 1, maximum: 3 });
  expect(await Attempt.findById(attempt._id)).toMatchObject({ status: 'Submitted', submissionReason: 'Timeout', evaluationStatus: 'Evaluated' });
  expect((await Attempt.findById(active._id)).status).toBe('Active');
});

it('OEP-39: full evaluation is idempotent under concurrency; failed evaluation retains responses and worker retries', async () => {
  await select(0);
  await finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' });
  const failure = vi.spyOn(Result, 'create').mockRejectedValueOnce(new Error('Temporary database failure'));
  const onError = vi.fn();
  await processPendingEvaluations({ onError });
  expect(onError).toHaveBeenCalledOnce();
  expect(await Result.countDocuments()).toBe(0);
  expect(await Response.countDocuments({ attemptId: attempt._id })).toBe(1);
  expect(await Attempt.findById(attempt._id)).toMatchObject({ status: 'Submitted', evaluationStatus: 'Pending' });
  failure.mockRestore();
  await Promise.all([processPendingEvaluations(), ...Array.from({ length: 3 }, () => evaluateSubmittedAttempt({ attemptId: attempt._id, studentId: student._id }))]);
  expect(await Result.countDocuments()).toBe(1);
  expect((await Result.findOne()).score).toBe(1);
});

it('OEP-40/41: empty, pending, evaluated and direct-access privacy use persisted owned data', async () => {
  const own = await login(student), stranger = await login(other), teacher = await login(instructor), outsider = await login(foreign);
  const path = `/api/exams/${exam.id}/results`;
  expect((await teacher.agent.get(path)).body).toEqual({ results: [], pending: [] });
  await finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' });
  const pending = (await own.agent.get('/api/student/pending-results')).body;
  expect(pending).toEqual([expect.objectContaining({ _id: attempt.id, examTitle: exam.title, status: 'Evaluation pending' })]);
  expect((await stranger.agent.get('/api/student/pending-results')).body).toEqual([]);
  expect((await teacher.agent.get(path)).body.pending[0].studentId).toMatchObject({ name: student.name, email: student.email });
  expect((await outsider.agent.get(path)).status).toBe(403);
  expect((await stranger.agent.get(`/api/student/attempts/${attempt.id}`)).status).toBe(404);
  await processPendingEvaluations();
  const result = await Result.findOne();
  expect((await own.agent.get('/api/student/pending-results')).body).toEqual([]);
  expect((await own.agent.get('/api/student/results')).body[0]).toMatchObject({ score: 0, maximum: 3, examTitle: exam.title });
  expect((await stranger.agent.get(`/api/student/results/${result.id}`)).status).toBe(404);
  expect((await own.agent.get('/api/student/results/000000000000000000000000')).status).toBe(404);
  const view = (await teacher.agent.get(path)).body;
  expect(view.pending).toEqual([]);
  expect(view.results[0]).toMatchObject({ score: 0, maximum: 3, studentId: { name: student.name, email: student.email } });
});

it('OEP-40/41: API failures return explicit errors without disclosing data', async () => {
  const own = await login(student), teacher = await login(instructor);
  const resultFailure = vi.spyOn(Result, 'find').mockImplementation(() => { throw new Error('private database details'); });
  expect((await own.agent.get('/api/student/results')).body).toEqual({ message: 'Could not load results' });
  expect((await teacher.agent.get(`/api/exams/${exam.id}/results`)).body).toEqual({ message: 'Could not load exam results' });
  resultFailure.mockRestore();
  vi.spyOn(Attempt, 'find').mockImplementation(() => { throw new Error('private database details'); });
  const response = await own.agent.get('/api/student/pending-results');
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ message: 'Could not load pending results' });
});
