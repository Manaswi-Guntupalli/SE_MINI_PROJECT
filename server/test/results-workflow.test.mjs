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

it('OEP44-IT-01: concurrent starts/resume and reload retain one attempt, deadline and latest acknowledged selection', async () => {
  const own = await login(student);
  const starts = await Promise.all(Array.from({ length: 4 }, () => own.agent.post(`/api/student/exams/${exam.id}/start`).set('X-CSRF-Token', own.token).send({ deadline: '2099-01-01', studentId: other.id })));
  expect(starts.every(response => response.status === 200)).toBe(true);
  expect(new Set(starts.map(response => response.body.attempt._id))).toEqual(new Set([attempt.id]));
  expect(new Set(starts.map(response => response.body.attempt.deadline))).toEqual(new Set([attempt.deadline.toISOString()]));
  await select(0);
  await select(1);
  await select(0, 1);
  const reload = (await own.agent.get(`/api/student/attempts/${attempt.id}`)).body;
  expect(reload.responses).toHaveLength(2);
  expect(reload.responses.find(response => response.questionId === exam.questions[0].id).selectedOptionId).toBe(exam.questions[0].options[1].id);
  expect(reload.attempt.deadline).toBe(attempt.deadline.toISOString());
  expect(JSON.stringify(reload)).not.toContain('isCorrect');
});

it('OEP44-SEC-01: anonymous, foreign-student and wrong-role direct APIs never mutate or disclose an attempt', async () => {
  const stranger = await login(other), teacher = await login(instructor);
  const body = { questionId: exam.questions[0].id, selectedOptionId: exam.questions[0].options[0].id };
  for (const [agent, token, expected] of [[request(app), '', 401], [stranger.agent, stranger.token, 404], [teacher.agent, teacher.token, 403]]) {
    expect((await agent.get(`/api/student/attempts/${attempt.id}`)).status).toBe(expected);
    const submit = await agent.post(`/api/student/attempts/${attempt.id}/submit`).set('X-CSRF-Token', token).send({});
    expect(submit.status).toBe(expected);
    const save = await agent.post(`/api/student/attempts/${attempt.id}/responses`).set('X-CSRF-Token', token).send(body);
    expect([401, 403, 409]).toContain(save.status);
  }
  expect((await Attempt.findById(attempt.id)).status).toBe('Active');
  expect(await Response.countDocuments()).toBe(0);
  expect(await Result.countDocuments()).toBe(0);
});

it.each([false, true])('OEP44-IT-02: manual/timeout races, expired=%s, repeat submission and late writes preserve one outcome', async expired => {
  await select(0);
  if (expired) await Attempt.collection.updateOne({ _id: attempt._id }, { $set: { startedAt: new Date(Date.now() - 120000), deadline: new Date(Date.now() - 60000) } });
  const outcomes = await Promise.allSettled(['Manual', 'Timeout', 'Manual', 'Timeout'].map(reason => finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason })));
  expect(outcomes.filter(outcome => outcome.status === 'fulfilled').length).toBeGreaterThan(0);
  const saved = await Attempt.findById(attempt.id);
  expect(saved.submissionReason).toBe(expired ? 'Timeout' : 'Manual');
  for (const outcome of outcomes.filter(outcome => outcome.status === 'fulfilled')) expect(outcome.value.submittedAt).toEqual(saved.submittedAt);
  const own = await login(student);
  const repeated = await Promise.all(Array.from({ length: 3 }, () => own.agent.post(`/api/student/attempts/${attempt.id}/submit`).set('X-CSRF-Token', own.token).send({ score: 999 })));
  expect(repeated.every(response => response.status === 200)).toBe(true);
  expect(new Set(repeated.map(response => response.body.result._id)).size).toBe(1);
  const late = await own.agent.post(`/api/student/attempts/${attempt.id}/responses`).set('X-CSRF-Token', own.token).send({ questionId: exam.questions[0].id, selectedOptionId: exam.questions[0].options[1].id });
  expect(late.status).toBe(409);
  expect((await Response.findOne()).selectedOptionId.toString()).toBe(exam.questions[0].options[0].id);
  expect(await Result.countDocuments()).toBe(1);
  expect((await Result.findOne()).score).toBe(1);
});

it('OEP44-FAIL-01: failed response storage is not acknowledged and does not expose database internals', async () => {
  const own = await login(student);
  const failure = vi.spyOn(Response, 'findOneAndUpdate').mockRejectedValueOnce(new Error('private database connection credentials'));
  try {
    const response = await own.agent.post(`/api/student/attempts/${attempt.id}/responses`).set('X-CSRF-Token', own.token).send({ questionId: exam.questions[0].id, selectedOptionId: exam.questions[0].options[0].id });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Could not save answer. Please retry.' });
    expect(await Response.countDocuments()).toBe(0);
    expect((await Attempt.findById(attempt.id)).status).toBe('Active');
  } finally { failure.mockRestore(); }
});
