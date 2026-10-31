import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { connectTestDatabase, closeTestDatabase } from './database.mjs';
const require = createRequire(import.meta.url);
const User = require('../models/User');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Response = require('../models/Response');
const Result = require('../models/Result');
const bcrypt = require('bcryptjs');
const { startAttempt, saveResponse, finalizeAttempt, persistResult } = require('../services/persistenceService');
let student, instructor, exam, attempt;
let passwordHash;
const question = () => ({ questionText: '2 + 2?', options: [{ text: '4', isCorrect: true }, { text: '5' }] });
const answer = () => ({ attemptId: attempt._id, studentId: student._id, questionId: exam.questions[0]._id, selectedOptionId: exam.questions[0].options[0]._id });

beforeAll(async () => {
  await connectTestDatabase();
  await Promise.all([User.init(), Exam.init(), Attempt.init(), Response.init(), Result.init()]);
  passwordHash = await bcrypt.hash('Persistence123!', 4);
});
afterAll(closeTestDatabase);
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Exam.deleteMany({}), Attempt.deleteMany({}), Response.deleteMany({}), Result.deleteMany({})]);
  instructor = await User.create({ name: 'Instructor', email: 'instructor@persistence.invalid', passwordHash, role: 'Instructor' });
  student = await User.create({ name: 'Student', email: 'student@persistence.invalid', passwordHash, role: 'Student' });
  exam = await Exam.create({ title: 'Integration', instructorId: instructor._id, duration: 30, status: 'Published', questions: [question()] });
  ({ attempt } = await startAttempt({ studentId: student._id, examId: exam._id }));
});

describe('OEP-43 real replica-set persistence and cross-branch integration', () => {
  it('enforces actual unique login, attempt, response and result indexes', async () => {
    await expect(User.create({ name: 'Duplicate', email: student.email.toUpperCase(), passwordHash, role: 'Student' })).rejects.toMatchObject({ code: 11000 });
    await expect(Attempt.create({ studentId: student._id, examId: exam._id, startedAt: new Date(), deadline: new Date(Date.now() + 60000) })).rejects.toMatchObject({ code: 11000 });
    const q = exam.questions[0];
    await saveResponse(answer());
    await expect(Response.create({ attemptId: attempt._id, questionId: q._id, selectedOptionId: q.options[0]._id })).rejects.toMatchObject({ code: 11000 });
    await finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' });
    await persistResult({ attemptId: attempt._id, score: 1, maximum: 1 });
    await expect(Result.create({ attemptId: attempt._id, examId: exam._id, studentId: student._id, score: 0, maximum: 1 })).rejects.toMatchObject({ code: 11000 });
  });
  it('rejects foreign students, nonexistent students and invalid question/option associations', async () => {
    await expect(saveResponse({ ...answer(), studentId: new mongoose.Types.ObjectId() })).rejects.toThrow();
    await expect(startAttempt({ studentId: new mongoose.Types.ObjectId(), examId: exam._id })).rejects.toThrow();
    await expect(saveResponse({ ...answer(), questionId: new mongoose.Types.ObjectId() })).rejects.toThrow('Question does not belong');
    await expect(saveResponse({ ...answer(), selectedOptionId: new mongoose.Types.ObjectId() })).rejects.toThrow('Option does not belong');
    expect(await Response.countDocuments()).toBe(0);
  });
  it('changes one persisted selection without resetting the authoritative deadline', async () => {
    const initialDeadline = attempt.deadline.toISOString();
    await saveResponse(answer());
    await saveResponse({ ...answer(), selectedOptionId: exam.questions[0].options[1]._id });
    expect(await Response.countDocuments()).toBe(1);
    expect(String((await Response.findOne()).selectedOptionId)).toBe(String(exam.questions[0].options[1]._id));
    expect((await Attempt.findById(attempt._id)).deadline.toISOString()).toBe(initialDeadline);
  });
  it('rejects expired writes even if a caller supplies a past clock; only timeout can finalize expiry', async () => {
    await Attempt.collection.updateOne({ _id: attempt._id }, { $set: { startedAt: new Date(Date.now() - 120000), deadline: new Date(Date.now() - 60000) } });
    await expect(saveResponse({ ...answer(), now: new Date(0) })).rejects.toThrow();
    await expect(finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual', now: new Date(0) })).rejects.toThrow('deadline passed');
    const submitted = await finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Timeout' });
    expect(submitted.status).toBe('Submitted');
    expect(submitted.submissionReason).toBe('Timeout');
    expect(submitted.submittedAt).toBeInstanceOf(Date);
    expect(await Response.countDocuments()).toBe(0);
  });
  it('refuses early timeout and leaves a still-active attempt unchanged', async () => {
    await expect(finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Timeout', now: new Date('2099-01-01') })).rejects.toThrow('not reached');
    expect((await Attempt.findById(attempt._id)).status).toBe('Active');
  });
  it('serializes concurrent answer saves and finalization with no post-submission writes', async () => {
    const outcomes = await Promise.allSettled([
      saveResponse(answer()), saveResponse({ ...answer(), selectedOptionId: exam.questions[0].options[1]._id }),
      finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' }),
      finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' }),
    ]);
    expect(outcomes[2].status).toBe('fulfilled');
    expect(outcomes[3].status).toBe('fulfilled');
    const stored = await Attempt.findById(attempt._id);
    expect(stored.status).toBe('Submitted');
    expect(outcomes[2].value.submittedAt).toEqual(outcomes[3].value.submittedAt);
    const saved = await Response.find().lean();
    expect(saved.length).toBeLessThanOrEqual(1);
    await expect(saveResponse(answer())).rejects.toThrow();
    expect(await Response.find().lean()).toEqual(saved);
  });
  it('persists a single immutable result and evaluation state atomically under concurrent retries', async () => {
    await finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' });
    const results = await Promise.all(Array.from({ length: 4 }, () => persistResult({ attemptId: attempt._id, score: 1, maximum: 1 })));
    expect(new Set(results.map(result => String(result._id))).size).toBe(1);
    expect(await Result.countDocuments()).toBe(1);
    expect((await Attempt.findById(attempt._id)).evaluationStatus).toBe('Evaluated');
    const repeat = await persistResult({ attemptId: attempt._id, score: 0, maximum: 1 });
    expect(repeat.score).toBe(1);
    expect(String(repeat.examId)).toBe(String(exam._id));
    expect(String(repeat.studentId)).toBe(String(student._id));
  });
  it('rolls back result/evaluation writes for invalid maxima and refuses evaluation of active attempts', async () => {
    await expect(persistResult({ attemptId: attempt._id, score: 1, maximum: 1 })).rejects.toThrow('Only submitted');
    await finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' });
    await expect(persistResult({ attemptId: attempt._id, score: 1, maximum: 2 })).rejects.toThrow('Maximum');
    expect(await Result.countDocuments()).toBe(0);
    expect((await Attempt.findById(attempt._id)).evaluationStatus).toBe('Pending');
  });
  it('rolls back an inserted Result if the evaluation status write fails and permits a clean retry', async () => {
    await finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' });
    const failure = vi.spyOn(Attempt, 'updateOne').mockRejectedValueOnce(new Error('Simulated evaluation status write failure'));
    try {
      await expect(persistResult({ attemptId: attempt._id, score: 1, maximum: 1 })).rejects.toThrow('Simulated');
    } finally { failure.mockRestore(); }
    expect(await Result.countDocuments()).toBe(0);
    expect((await Attempt.findById(attempt._id)).evaluationStatus).toBe('Pending');
    expect((await persistResult({ attemptId: attempt._id, score: 1, maximum: 1 })).score).toBe(1);
  });
  it('preserves historical relations when an Admin changes account role/status', async () => {
    await saveResponse(answer());
    await finalizeAttempt({ attemptId: attempt._id, studentId: student._id, reason: 'Manual' });
    await persistResult({ attemptId: attempt._id, score: 1, maximum: 1 });
    await User.findByIdAndUpdate(student._id, { role: 'Instructor', active: false });
    expect(String((await Attempt.findById(attempt._id)).studentId)).toBe(String(student._id));
    expect(String((await Result.findOne()).studentId)).toBe(String(student._id));
    expect(await Response.countDocuments()).toBe(1);
    expect(await Exam.exists({ instructorId: instructor._id })).toBeTruthy();
  });
  it('prevents resetting attempt ownership/deadline and rejects invalid Published definitions', async () => {
    const initial = await Attempt.findById(attempt._id);
    initial.deadline = new Date('2099-01-01');
    initial.studentId = instructor._id;
    await initial.save();
    expect(initial.deadline).toEqual(attempt.deadline);
    expect(String(initial.studentId)).toBe(String(student._id));
    await expect(Exam.create({ title: 'Invalid', duration: 30, instructorId: instructor._id, status: 'Published' })).rejects.toThrow();
    const changed = await Exam.findById(exam._id);
    changed.questions[0].options[0].text = 'Changed key';
    await expect(changed.save()).rejects.toThrow('immutable');
  });
});
