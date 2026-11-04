import { createRequire } from 'node:module';
import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { connectTestDatabase, closeTestDatabase } from './database.mjs';
const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Response = require('../models/Response');
const Result = require('../models/Result');
const bcrypt = require('bcryptjs');
let student, exam, agent, token, attempt, passwordHash;
beforeAll(async () => {
  await connectTestDatabase();
  await Promise.all([User.init(), Exam.init(), Attempt.init(), Response.init(), Result.init()]);
  passwordHash = await bcrypt.hash('Student12345!', 4);
});
afterAll(closeTestDatabase);
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Exam.deleteMany({}), Attempt.deleteMany({}), Response.deleteMany({}), Result.deleteMany({})]);
  const instructor = await User.create({ name: 'Teacher', email: 'teacher@student.invalid', passwordHash, role: 'Instructor' });
  student = await User.create({ name: 'Student', email: 'student@student.invalid', passwordHash, role: 'Student' });
  exam = await Exam.create({ title: 'Student flow', instructorId: instructor._id, status: 'Published', duration: 30,
    questions: [{ questionText: '2 + 2?', options: [{ text: '4', isCorrect: true }, { text: '5' }] }] });
  agent = request.agent(app);
  expect((await agent.post('/api/auth/login').send({ email: student.email, password: 'Student12345!' })).status).toBe(200);
  token = (await agent.get('/api/auth/csrf-token')).body.csrfToken;
  const started = await agent.post(`/api/student/exams/${exam.id}/start`).set('X-CSRF-Token', token).send({});
  expect(started.status).toBe(200);
  attempt = started.body.attempt;
});
const save = (revision, option = 0, question = exam.questions[0].id) => agent.put(`/api/student/attempts/${attempt._id}/responses/${question}`)
  .set('X-CSRF-Token', token).send({ selectedOptionId: exam.questions[0].options[option].id, expectedRevision: revision });
it('#40 creates, changes and reloads one response; stale requests never overwrite', async () => {
  expect((await save(0)).body.response.revision).toBe(1);
  expect((await save(1, 1)).body.response.revision).toBe(2);
  expect((await save(0)).status).toBe(409);
  const resumed = await agent.get(`/api/student/attempts/${attempt._id}`);
  expect(resumed.body.responses[0].selectedOptionId).toBe(exam.questions[0].options[1].id);
  expect(await Response.countDocuments()).toBe(1);
  expect(JSON.stringify(resumed.body)).not.toMatch(/isCorrect|correctOption/);
});
it('#40 validates membership, CSRF, ownership and the strict deadline', async () => {
  expect((await save(0, 0, student.id)).status).toBe(400);
  expect((await agent.put(`/api/student/attempts/${attempt._id}/responses/${exam.questions[0].id}`).set('X-CSRF-Token', token)
    .send({ selectedOptionId: student.id, expectedRevision: 0 })).status).toBe(400);
  expect((await request(app).put(`/api/student/attempts/${attempt._id}/responses/${exam.questions[0].id}`).send({})).status).toBe(401);
  await Attempt.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(attempt._id) }, { $set: { studentId: exam.instructorId } });
  expect((await save(0)).status).toBe(409);
  await Attempt.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(attempt._id) }, { $set: { studentId: student._id, deadline: new Date() } });
  expect((await save(0)).status).toBe(409);
  expect(await Response.countDocuments()).toBe(0);
});


it('#47 manual submission is idempotent, evaluates saved answers and blocks later writes', async () => {
  await save(0);
  const submit = () => agent.post(`/api/student/attempts/${attempt._id}/submit`).set('X-CSRF-Token', token).send({ reason: 'Manual' });
  const results = await Promise.all([submit(), submit(), save(1, 1)]);
  expect(results[0].status).toBe(200);
  expect(results[1].status).toBe(200);
  expect(results[0].body.attempt.submittedAt).toBe(results[1].body.attempt.submittedAt);
  expect(await Result.countDocuments()).toBe(1);
  expect((await save(2)).status).toBe(409);
  const response = (await Response.findOne()).selectedOptionId;
  expect((await Result.findOne()).score).toBe(String(response) === exam.questions[0].options[0].id ? 1 : 0);
  expect((await agent.get('/api/student/results')).body).toHaveLength(1);
});
it('#47 rejects foreign submission and early timeout', async () => {
  expect((await agent.post(`/api/student/attempts/${attempt._id}/submit`).set('X-CSRF-Token', token).send({ reason: 'Timeout' })).status).toBe(409);
  await Attempt.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(attempt._id) }, { $set: { studentId: exam.instructorId } });
  expect((await agent.post(`/api/student/attempts/${attempt._id}/submit`).set('X-CSRF-Token', token).send({})).status).toBe(404);
});

it('AC40-REVISION: concurrent tabs with one revision cannot overwrite each other', async () => {
  const outcomes = await Promise.all([save(0, 0), save(0, 1)]);
  expect(outcomes.map(value => value.status).sort()).toEqual([200, 409]);
  const winner = outcomes.find(value => value.status === 200).body.response;
  const stored = await Response.findOne({ attemptId: attempt._id });
  expect(stored.revision).toBe(1);
  expect(String(stored.selectedOptionId)).toBe(winner.selectedOptionId);
  expect((await agent.put(`/api/student/attempts/${attempt._id}/responses/${exam.questions[0].id}`)
    .set('X-CSRF-Token', token).send({ selectedOptionId: exam.questions[0].options[0].id })).status).toBe(400);
});

it('AC46-READ: restoring an expired attempt finalizes it without reopening editing', async () => {
  await save(0);
  await Attempt.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(attempt._id) }, { $set: { deadline: new Date(Date.now() - 1000) } });
  const restored = await agent.get(`/api/student/attempts/${attempt._id}`);
  expect(restored.status).toBe(200);
  expect(restored.body.attempt.status).toBe('Submitted');
  expect(restored.body.attempt.submissionReason).toBe('Timeout');
  expect(restored.body.result.score).toBe(1);
  expect((await save(1, 1)).status).toBe(409);
});

it('AC40-LEGACY: legacy POST cannot bypass optimistic revisions or overwrite the latest acknowledged choice', async () => {
  expect((await save(0, 0)).status).toBe(200);
  expect((await save(1, 1)).status).toBe(200);
  const url = `/api/student/attempts/${attempt._id}/responses`;
  const body = { questionId: exam.questions[0].id, selectedOptionId: exam.questions[0].options[0].id };
  expect((await agent.post(url).set('X-CSRF-Token', token).send(body)).status).toBe(400);
  expect((await agent.post(url).set('X-CSRF-Token', token).send({ ...body, expectedRevision: 0 })).status).toBe(409);
  expect(String((await Response.findOne({ attemptId: attempt._id })).selectedOptionId)).toBe(exam.questions[0].options[1].id);
  expect((await agent.post(url).set('X-CSRF-Token', token).send({ ...body, expectedRevision: 2 })).status).toBe(200);
  expect((await Response.findOne({ attemptId: attempt._id })).revision).toBe(3);
});
