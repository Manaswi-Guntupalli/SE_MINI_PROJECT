import { createRequire } from 'node:module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { connectTestDatabase, closeTestDatabase } from './database.mjs';

const require = createRequire(import.meta.url);
const app = require('../app');
const Exam = require('../models/Exam');
const examInput = (overrides = {}) => ({
  title: 'Algorithms Quiz', instructorId: 'instructor-a',
  startTime: '2026-10-24T12:00:00.000Z', duration: 30, ...overrides,
});
const questionInput = (overrides = {}) => ({
  questionText: '2 + 2?', options: [
    { text: '4', isCorrect: true }, { text: '5', isCorrect: false },
  ], ...overrides,
});
async function createExam(overrides = {}) {
  const response = await request(app).post('/api/exams').send(examInput(overrides));
  expect(response.status).toBe(201);
  return response.body;
}

// These test the existing prototype's functionality, not authentication/ownership.
// Known acceptance gaps are reproduced separately by npm run audit:sprint1.
describe('Exam API with a real isolated MongoDB database', () => {
  beforeAll(connectTestDatabase);
  afterAll(closeTestDatabase);
  beforeEach(async () => { await Exam.deleteMany({}); });

  it('IT-EXAM-01: serves the application health response', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Online Exam Portal');
  });

  it('IT-EXAM-02: persists a new draft and reloads it from MongoDB', async () => {
    const exam = await createExam();
    expect(exam.status).toBe('Draft');
    expect((await Exam.findById(exam._id)).title).toBe('Algorithms Quiz');
    expect((await request(app).get(`/api/exams/${exam._id}`)).body._id).toBe(exam._id);
  });

  it('IT-EXAM-03: rejects blank titles without inserting a partial record', async () => {
    const response = await request(app).post('/api/exams').send(examInput({ title: '  ' }));
    expect(response.status).toBe(400);
    expect(await Exam.countDocuments()).toBe(0);
  });

  it('IT-EXAM-04: filters the prototype list by its supplied instructor identifier', async () => {
    await createExam();
    await createExam({ instructorId: 'instructor-b', title: 'Other exam' });
    const response = await request(app).get('/api/exams/instructor/instructor-a');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Algorithms Quiz');
  });

  it('IT-EXAM-05: saves and reloads draft edits', async () => {
    const exam = await createExam();
    const response = await request(app).put(`/api/exams/${exam._id}`).send({ title: 'Revised', duration: 45 });
    expect(response.status).toBe(200);
    expect((await Exam.findById(exam._id)).duration).toBe(45);
    expect((await request(app).get(`/api/exams/${exam._id}`)).body.title).toBe('Revised');
  });

  it('IT-EXAM-06: deletes a draft together with its embedded question data', async () => {
    const exam = await createExam({ questions: [questionInput()] });
    expect((await request(app).delete(`/api/exams/${exam._id}`)).status).toBe(200);
    expect(await Exam.findById(exam._id)).toBeNull();
  });

  it('IT-EXAM-07: returns 404 for a missing exam and 400 for a malformed id', async () => {
    expect((await request(app).get('/api/exams/000000000000000000000001')).status).toBe(404);
    expect((await request(app).get('/api/exams/not-an-object-id')).status).toBe(400);
  });

  it('IT-MCQ-01: adds, edits and deletes an MCQ with durable changes', async () => {
    const exam = await createExam();
    const added = await request(app).post(`/api/exams/${exam._id}/questions`).send(questionInput());
    expect(added.status).toBe(201);
    const questionId = added.body.questions[0]._id;
    const edited = await request(app).put(`/api/exams/${exam._id}/questions/${questionId}`).send(questionInput({ questionText: '3 + 1?' }));
    expect(edited.status).toBe(200);
    expect((await Exam.findById(exam._id)).questions[0].questionText).toBe('3 + 1?');
    expect((await request(app).delete(`/api/exams/${exam._id}/questions/${questionId}`)).status).toBe(200);
    expect((await Exam.findById(exam._id)).questions).toHaveLength(0);
  });

  it.each([0, 2])('IT-MCQ-02: rejects an MCQ with %s correct options', async (correctCount) => {
    const exam = await createExam();
    const options = ['4', '5'].map((text, index) => ({ text, isCorrect: index < correctCount }));
    const response = await request(app).post(`/api/exams/${exam._id}/questions`).send(questionInput({ options }));
    expect(response.status).toBe(400);
    expect((await Exam.findById(exam._id)).questions).toHaveLength(0);
  });

  it('IT-MCQ-03: rejects blank option text and leaves the stored draft unchanged', async () => {
    const exam = await createExam();
    const response = await request(app).post(`/api/exams/${exam._id}/questions`).send(questionInput({ options: [{ text: '', isCorrect: true }, { text: '5' }] }));
    expect(response.status).toBe(400);
    expect((await Exam.findById(exam._id)).questions).toHaveLength(0);
  });

  it('IT-MCQ-04: rejects a question identifier belonging to a different exam', async () => {
    const first = await createExam({ questions: [questionInput()] });
    const second = await createExam();
    const response = await request(app).put(`/api/exams/${second._id}/questions/${first.questions[0]._id}`).send(questionInput());
    expect(response.status).toBe(404);
    expect((await Exam.findById(second._id)).questions).toHaveLength(0);
  });

  it('IT-PUBLISH-01: rejects publication of an empty draft', async () => {
    const exam = await createExam();
    expect((await request(app).post(`/api/exams/${exam._id}/publish`)).status).toBe(400);
    expect((await Exam.findById(exam._id)).status).toBe('Draft');
  });

  it('IT-PUBLISH-02: rejects publication of stored questions without a correct option', async () => {
    const exam = await createExam({ questions: [questionInput({ options: [{ text: '4' }, { text: '5' }] })] });
    expect((await request(app).post(`/api/exams/${exam._id}/publish`)).status).toBe(400);
    expect((await Exam.findById(exam._id)).status).toBe('Draft');
  });

  it('IT-PUBLISH-03: publishes valid content, persists status and never duplicates on repeat', async () => {
    const exam = await createExam({ questions: [questionInput()] });
    expect((await request(app).post(`/api/exams/${exam._id}/publish`)).status).toBe(200);
    expect((await Exam.findById(exam._id)).status).toBe('Published');
    expect((await request(app).post(`/api/exams/${exam._id}/publish`)).status).toBe(400);
    expect(await Exam.countDocuments()).toBe(1);
  });

  it('IT-PUBLISH-04: blocks published exam/question edits and deletion', async () => {
    const exam = await createExam({ questions: [questionInput()] });
    await request(app).post(`/api/exams/${exam._id}/publish`);
    const base = `/api/exams/${exam._id}`;
    expect((await request(app).put(base).send({ title: 'Changed' })).status).toBe(400);
    expect((await request(app).delete(base)).status).toBe(400);
    expect((await request(app).post(`${base}/questions`).send(questionInput())).status).toBe(400);
    expect((await request(app).put(`${base}/questions/${exam.questions[0]._id}`).send(questionInput())).status).toBe(400);
    expect((await request(app).delete(`${base}/questions/${exam.questions[0]._id}`)).status).toBe(400);
    expect((await Exam.findById(exam._id)).title).toBe('Algorithms Quiz');
  });
});
