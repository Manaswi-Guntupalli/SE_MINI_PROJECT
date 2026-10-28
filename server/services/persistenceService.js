const mongoose = require('mongoose');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Response = require('../models/Response');
const Result = require('../models/Result');

const eligible = now => ({ status: 'Published', $or: [{ startTime: null }, { startTime: { $lte: now } }] });
const activeAtDatabaseTime = { status: 'Active', $expr: { $gt: ['$deadline', '$$NOW'] } };
const unavailable = () => Object.assign(new Error('Attempt unavailable, expired or already submitted'), { status: 409 });

async function transaction(work) {
  const session = await mongoose.startSession();
  try { return await session.withTransaction(() => work(session)); }
  finally { await session.endSession(); }
}

async function startAttempt({ examId, studentId }) {
  const now = new Date();
  if (!await User.exists({ _id: studentId, role: 'Student', active: true })) throw unavailable();
  const exam = await Exam.findOne({ _id: examId, ...eligible(now) });
  if (!exam) throw Object.assign(new Error('Exam is not available'), { status: 404 });
  const query = { examId: exam._id, studentId };
  let attempt;
  try {
    attempt = await Attempt.findOneAndUpdate(query, { $setOnInsert: {
      ...query, startedAt: now, deadline: new Date(now.getTime() + exam.duration * 60000), status: 'Active',
    } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    attempt = await Attempt.findOne(query);
  }
  if (attempt.status === 'Active' && attempt.deadline <= new Date()) {
    await require('./submissionService').submitAttempt({ attemptId: attempt._id, studentId, reason: 'Timeout' });
  }
  if (attempt.status !== 'Active' || attempt.deadline <= new Date()) throw Object.assign(new Error('This attempt has ended'), { status: 409 });
  return { attempt, exam };
}

// The only supported answer-write boundary. Caller clocks are intentionally ignored.
async function saveResponse({ attemptId, studentId, questionId, selectedOptionId, expectedRevision }) {
  return transaction(async session => {
    const student = await User.exists({ _id: studentId, role: 'Student', active: true }).session(session);
    if (!student) throw unavailable();
    // A counter always acquires a real write lock, even within one millisecond.
    const attempt = await Attempt.findOneAndUpdate(
      { _id: attemptId, studentId, ...activeAtDatabaseTime }, { $inc: { writeVersion: 1 } }, { new: true, session },
    );
    if (!attempt) throw unavailable();
    const exam = await Exam.findOne({ _id: attempt.examId, status: 'Published' }).session(session);
    if (!exam) throw new Error('Published exam not found');
    const question = exam.questions.id(questionId);
    if (!question) throw Object.assign(new Error('Question does not belong to this exam'), { status: 400 });
    if (!question.options.id(selectedOptionId)) throw Object.assign(new Error('Option does not belong to this question'), { status: 400 });
    const previous = await Response.findOne({ attemptId: attempt._id, questionId: question._id }).session(session);
    if (expectedRevision !== undefined && expectedRevision !== (previous?.revision || 0)) {
      throw Object.assign(new Error('Answer changed in another request. Reload the attempt before retrying.'), { status: 409 });
    }
    const response = await Response.findOneAndUpdate(
      { attemptId: attempt._id, questionId: question._id }, { $set: { selectedOptionId }, $inc: { revision: 1 } },
      { upsert: true, new: true, runValidators: true, session },
    );
    // Recheck database time after membership checks/upsert; failure rolls everything back.
    const gate = await Attempt.updateOne(
      { _id: attempt._id, ...activeAtDatabaseTime }, { $inc: { writeVersion: 1 } }, { session },
    );
    if (gate.modifiedCount !== 1) throw unavailable();
    return response;
  });
}

async function finalizeAttempt({ attemptId, studentId, reason }) {
  if (!['Manual', 'Timeout'].includes(reason)) throw new Error('Invalid submission reason');
  return transaction(async session => {
    const attempt = await Attempt.findOne({ _id: attemptId, studentId }).session(session);
    if (!attempt) throw Object.assign(new Error('Attempt not found'), { status: 404 });
    if (attempt.status === 'Submitted') return attempt;
    const condition = reason === 'Manual' ? { $gt: ['$deadline', '$$NOW'] } : { $lte: ['$deadline', '$$NOW'] };
    const submitted = await Attempt.findOneAndUpdate(
      { _id: attempt._id, status: 'Active', $expr: condition },
      [{ $set: { status: 'Submitted', submittedAt: '$$NOW', submissionReason: reason,
        updatedAt: '$$NOW', writeVersion: { $add: ['$writeVersion', 1] } } }],
      { new: true, session, updatePipeline: true },
    );
    if (!submitted) throw Object.assign(new Error(reason === 'Manual' ? 'Attempt deadline passed' : 'Attempt deadline not reached'), { status: 409 });
    return submitted;
  });
}

async function persistResult({ attemptId, score, maximum }) {
  if (!Number.isInteger(score) || !Number.isInteger(maximum) || score < 0 || maximum < 0 || score > maximum) throw new Error('Invalid score');
  return transaction(async session => {
    // Serialize retries on Attempt, then insert result and mark evaluation atomically.
    const attempt = await Attempt.findOneAndUpdate(
      { _id: attemptId, status: 'Submitted' }, { $inc: { writeVersion: 1 } }, { new: true, session },
    );
    if (!attempt) throw new Error('Only submitted attempts can be evaluated');
    const existing = await Result.findOne({ attemptId }).session(session);
    if (existing) return existing;
    const exam = await Exam.findOne({ _id: attempt.examId, status: 'Published' }).session(session);
    if (!exam || maximum !== exam.questions.length) throw new Error('Maximum must match the published question count');
    const [result] = await Result.create([{
      attemptId: attempt._id, examId: attempt.examId, studentId: attempt.studentId, score, maximum, status: 'Evaluated',
    }], { session });
    await Attempt.updateOne({ _id: attempt._id, status: 'Submitted' }, { $set: { evaluationStatus: 'Evaluated' } }, { session });
    return result;
  });
}

module.exports = { eligible, startAttempt, saveResponse, finalizeAttempt, persistResult };
