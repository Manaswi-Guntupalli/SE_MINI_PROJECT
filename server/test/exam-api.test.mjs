import { createRequire } from 'node:module';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import request from 'supertest';
import { connectTestDatabase, closeTestDatabase } from './database.mjs';

const require = createRequire(import.meta.url);

const app = require('../app');
const Exam = require('../models/Exam');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

let agent;
let csrfToken;
let instructor;

const examInput = (overrides = {}) => ({
  title: 'Algorithms Quiz',
  description: 'Release 1 integration test',
  startTime: '2026-10-24T12:00:00.000Z',
  duration: 30,
  ...overrides,
});

const questionInput = (overrides = {}) => ({
  questionText: '2 + 2?',
  options: [
    { text: '4', isCorrect: true },
    { text: '5', isCorrect: false },
  ],
  ...overrides,
});

async function loginAsInstructor() {
  agent = request.agent(app);

  const loginResponse = await agent
    .post('/api/auth/login')
    .send({
      email: 'instructor@test.com',
      password: 'Instructor123!',
    });

  expect(loginResponse.status).toBe(200);

  const csrfResponse = await agent.get('/api/auth/csrf-token');

  expect(csrfResponse.status).toBe(200);

  csrfToken = csrfResponse.body.csrfToken;
}

async function createExam(overrides = {}) {
  const response = await agent
    .post('/api/exams')
    .set('X-CSRF-Token', csrfToken)
    .send(examInput(overrides));

  expect(response.status).toBe(201);

  return response.body;
}

describe('Exam API with authenticated Release 1 access', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await Exam.deleteMany({});
    await User.deleteMany({});

    const passwordHash = await bcrypt.hash(
      'Instructor123!',
      12
    );

    instructor = await User.create({
      name: 'Test Instructor',
      email: 'instructor@test.com',
      passwordHash,
      role: 'Instructor',
      active: true,
    });

    await loginAsInstructor();
  });

  it('IT-EXAM-01: serves the application health response', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.message).toContain(
      'Online Exam Portal'
    );
  });

  it('IT-EXAM-02: persists a new draft and reloads it from MongoDB', async () => {
    const exam = await createExam();

    expect(exam.status).toBe('Draft');

    const stored = await Exam.findById(exam._id);

    expect(stored.title).toBe('Algorithms Quiz');
    expect(String(stored.instructorId)).toBe(
      String(instructor._id)
    );

    const response = await agent.get(
      `/api/exams/${exam._id}`
    );

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(exam._id);
  });

  it('IT-EXAM-03: rejects blank titles without inserting a partial record', async () => {
    const response = await agent
      .post('/api/exams')
      .set('X-CSRF-Token', csrfToken)
      .send(examInput({ title: '   ' }));

    expect(response.status).toBe(400);
    expect(await Exam.countDocuments()).toBe(0);
  });

  it('IT-EXAM-04: lists only exams owned by the authenticated Instructor', async () => {
    await createExam();

    const otherInstructor = await User.create({
      name: 'Other Instructor',
      email: 'other@test.com',
      passwordHash: await bcrypt.hash('Other123!', 12),
      role: 'Instructor',
      active: true,
    });

    await Exam.create({
      title: 'Other exam',
      instructorId: otherInstructor._id,
      duration: 20,
    });

    const response = await agent.get('/api/exams/mine');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe(
      'Algorithms Quiz'
    );
  });

  it('IT-EXAM-05: saves and reloads draft edits', async () => {
    const exam = await createExam();

    const response = await agent
      .put(`/api/exams/${exam._id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        title: 'Revised',
        duration: 45,
      });

    expect(response.status).toBe(200);

    expect(
      (await Exam.findById(exam._id)).duration
    ).toBe(45);

    const reloaded = await agent.get(
      `/api/exams/${exam._id}`
    );

    expect(reloaded.body.title).toBe('Revised');
  });

  it('IT-EXAM-06: deletes a draft together with its embedded question data', async () => {
    const exam = await createExam();

    const added = await agent
      .post(`/api/exams/${exam._id}/questions`)
      .set('X-CSRF-Token', csrfToken)
      .send(questionInput());

    expect(added.status).toBe(201);

    const response = await agent
      .delete(`/api/exams/${exam._id}`)
      .set('X-CSRF-Token', csrfToken);

    expect(response.status).toBe(200);
    expect(await Exam.findById(exam._id)).toBeNull();
  });

  it('IT-EXAM-07: returns 404 for a missing exam and 400 for a malformed id', async () => {
    const missing = await agent.get(
      '/api/exams/000000000000000000000001'
    );

    const malformed = await agent.get(
      '/api/exams/not-an-object-id'
    );

    expect(missing.status).toBe(404);
    expect(malformed.status).toBe(400);
  });

  it('IT-MCQ-01: adds, edits and deletes an MCQ with durable changes', async () => {
    const exam = await createExam();

    const added = await agent
      .post(`/api/exams/${exam._id}/questions`)
      .set('X-CSRF-Token', csrfToken)
      .send(questionInput());

    expect(added.status).toBe(201);

    const questionId = added.body.questions[0]._id;

    const edited = await agent
      .put(
        `/api/exams/${exam._id}/questions/${questionId}`
      )
      .set('X-CSRF-Token', csrfToken)
      .send(
        questionInput({
          questionText: '3 + 1?',
        })
      );

    expect(edited.status).toBe(200);

    expect(
      (await Exam.findById(exam._id))
        .questions[0]
        .questionText
    ).toBe('3 + 1?');

    const deleted = await agent
      .delete(
        `/api/exams/${exam._id}/questions/${questionId}`
      )
      .set('X-CSRF-Token', csrfToken);

    expect(deleted.status).toBe(200);

    expect(
      (await Exam.findById(exam._id)).questions
    ).toHaveLength(0);
  });

  it('IT-MCQ-02: allows incomplete MCQ options while the exam remains a draft', async () => {
    const exam = await createExam();

    const response = await agent
      .post(`/api/exams/${exam._id}/questions`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        questionInput({
          options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
          ],
        })
      );

    expect(response.status).toBe(201);

    const stored = await Exam.findById(exam._id);

    expect(stored.status).toBe('Draft');
    expect(stored.questions).toHaveLength(1);
  });

  it('IT-MCQ-03: rejects blank question text and leaves the draft unchanged', async () => {
    const exam = await createExam();

    const response = await agent
      .post(`/api/exams/${exam._id}/questions`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        questionInput({
          questionText: '   ',
        })
      );

    expect(response.status).toBe(400);

    expect(
      (await Exam.findById(exam._id)).questions
    ).toHaveLength(0);
  });

  it('IT-MCQ-04: rejects a question identifier belonging to a different exam', async () => {
    const first = await createExam();

    const added = await agent
      .post(`/api/exams/${first._id}/questions`)
      .set('X-CSRF-Token', csrfToken)
      .send(questionInput());

    const questionId = added.body.questions[0]._id;

    const second = await createExam({
      title: 'Second Exam',
    });

    const response = await agent
      .put(
        `/api/exams/${second._id}/questions/${questionId}`
      )
      .set('X-CSRF-Token', csrfToken)
      .send(questionInput());

    expect(response.status).toBe(404);

    expect(
      (await Exam.findById(second._id)).questions
    ).toHaveLength(0);
  });

  it('IT-PUBLISH-01: rejects publication of an empty draft', async () => {
    const exam = await createExam();

    const response = await agent
      .post(`/api/exams/${exam._id}/publish`)
      .set('X-CSRF-Token', csrfToken);

    expect(response.status).toBe(400);

    expect(
      (await Exam.findById(exam._id)).status
    ).toBe('Draft');
  });

  it('IT-PUBLISH-02: rejects publication of stored questions without a correct option', async () => {
    const exam = await createExam();

    const added = await agent
      .post(`/api/exams/${exam._id}/questions`)
      .set('X-CSRF-Token', csrfToken)
      .send(
        questionInput({
          options: [
            { text: '4', isCorrect: false },
            { text: '5', isCorrect: false },
          ],
        })
      );

    expect(added.status).toBe(201);

    const response = await agent
      .post(`/api/exams/${exam._id}/publish`)
      .set('X-CSRF-Token', csrfToken);

    expect(response.status).toBe(400);

    expect(
      (await Exam.findById(exam._id)).status
    ).toBe('Draft');
  });

  it('IT-PUBLISH-03: publishes valid content, persists status and never duplicates on repeat', async () => {
    const exam = await createExam();

    const added = await agent
      .post(`/api/exams/${exam._id}/questions`)
      .set('X-CSRF-Token', csrfToken)
      .send(questionInput());

    expect(added.status).toBe(201);

    const published = await agent
      .post(`/api/exams/${exam._id}/publish`)
      .set('X-CSRF-Token', csrfToken);

    expect(published.status).toBe(200);

    expect(
      (await Exam.findById(exam._id)).status
    ).toBe('Published');

    const repeated = await agent
      .post(`/api/exams/${exam._id}/publish`)
      .set('X-CSRF-Token', csrfToken);

    expect(repeated.status).toBe(400);
    expect(await Exam.countDocuments()).toBe(1);
  });

  it('IT-PUBLISH-04: blocks published exam and question changes', async () => {
    const exam = await createExam();

    const added = await agent
      .post(`/api/exams/${exam._id}/questions`)
      .set('X-CSRF-Token', csrfToken)
      .send(questionInput());

    expect(added.status).toBe(201);

    const questionId = added.body.questions[0]._id;

    const published = await agent
      .post(`/api/exams/${exam._id}/publish`)
      .set('X-CSRF-Token', csrfToken);

    expect(published.status).toBe(200);

    const base = `/api/exams/${exam._id}`;

    expect(
      (
        await agent
          .put(base)
          .set('X-CSRF-Token', csrfToken)
          .send({ title: 'Changed' })
      ).status
    ).toBe(400);

    expect(
      (
        await agent
          .delete(base)
          .set('X-CSRF-Token', csrfToken)
      ).status
    ).toBe(400);

    expect(
      (
        await agent
          .post(`${base}/questions`)
          .set('X-CSRF-Token', csrfToken)
          .send(questionInput())
      ).status
    ).toBe(400);

    expect(
      (
        await agent
          .put(`${base}/questions/${questionId}`)
          .set('X-CSRF-Token', csrfToken)
          .send(questionInput())
      ).status
    ).toBe(400);

    expect(
      (
        await agent
          .delete(`${base}/questions/${questionId}`)
          .set('X-CSRF-Token', csrfToken)
      ).status
    ).toBe(400);

    expect(
      (await Exam.findById(exam._id)).title
    ).toBe('Algorithms Quiz');
  });
});