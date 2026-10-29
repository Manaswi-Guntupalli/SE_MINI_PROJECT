const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Response = require('../models/Response');
const Result = require('../models/Result');
const { persistResult, finalizeAttempt } = require('./persistenceService');

async function evaluateSubmittedAttempt({ attemptId, studentId }) {
  let attempt = await Attempt.findOne({ _id: attemptId, studentId });
  if (!attempt) throw Object.assign(new Error('Attempt not found'), { status: 404 });
  const saved = await Result.findOne({ attemptId: attempt._id, studentId });
  if (saved) return saved;
  if (attempt.status === 'Active') {
    if (attempt.deadline > new Date()) throw Object.assign(new Error('Attempt is still active'), { status: 409 });
    attempt = await finalizeAttempt({ attemptId: attempt._id, studentId, reason: 'Timeout' });
  }
  if (attempt.status !== 'Submitted') throw Object.assign(new Error('Attempt must be submitted'), { status: 409 });
  const exam = await Exam.findOne({ _id: attempt.examId, status: 'Published' });
  if (!exam) throw Object.assign(new Error('Published exam not found'), { status: 409 });
  const responses = await Response.find({ attemptId: attempt._id }).select('questionId selectedOptionId');
  const answers = new Map(responses.map(r => [String(r.questionId), String(r.selectedOptionId)]));
  let score = 0;
  for (const q of exam.questions) {
    const correct = q.options.filter(o => o.isCorrect === true);
    if (correct.length !== 1) throw Object.assign(new Error('Published answer key is invalid'), { status: 409 });
    if (answers.get(String(q._id)) === String(correct[0]._id)) score += 1;
  }
  try { return await persistResult({ attemptId: attempt._id, score, maximum: exam.questions.length }); }
  catch (error) {
    if (error.code === 11000) {
      const result = await Result.findOne({ attemptId: attempt._id });
      if (result) return result;
    }
    throw error;
  }
}
module.exports = { evaluateSubmittedAttempt };
