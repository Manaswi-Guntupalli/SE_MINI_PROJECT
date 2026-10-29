const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Response = require('../models/Response');
const Result = require('../models/Result');
const { persistResult, finalizeAttempt } = require('./persistenceService');

function evaluateAnswers(questions, answers) {
  if (!Array.isArray(questions) || !Array.isArray(answers)) throw new Error('Questions and answers must be arrays');
  const answerMap = new Map();
  for (const answer of answers) {
    const questionId = String(answer.questionId);
    if (answerMap.has(questionId)) throw new Error('Duplicate answer for question');
    answerMap.set(questionId, String(answer.selectedOptionId));
  }
  let score = 0;
  for (const question of questions) {
    const correct = question.options.filter(option => option.isCorrect === true);
    if (correct.length !== 1) throw new Error('Published answer key must contain exactly one correct option per question');
    if (answerMap.get(String(question._id)) === String(correct[0]._id)) score += 1;
  }
  return { score, maximumScore: questions.length };
}

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
  const scored = evaluateAnswers(exam.questions, responses);
  try {
    return await persistResult({ attemptId: attempt._id, score: scored.score, maximum: scored.maximumScore });
  } catch (error) {
    if (error.code === 11000 || error.code === 112 || error.hasErrorLabel?.('TransientTransactionError')) {
      const result = await Result.findOne({ attemptId: attempt._id });
      if (result) return result;
    }
    throw error;
  }
}
module.exports = { evaluateAnswers, evaluateSubmittedAttempt };
