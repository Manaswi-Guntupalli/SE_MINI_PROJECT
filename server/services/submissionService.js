const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const Response = require('../models/Response');
const { finalizeAttempt, persistResult } = require('./persistenceService');

// OEP-39 handoff: score the immutable saved response set after finalization.
// Release 1 awards one point per correct MCQ; no negative marking.
async function evaluateAttempt(attempt) {
  const exam = await Exam.findById(attempt.examId);
  if (!exam) throw new Error('Exam unavailable for evaluation');
  const responses = await Response.find({ attemptId: attempt._id }).lean();
  const selections = new Map(responses.map(response => [String(response.questionId), String(response.selectedOptionId)]));
  const score = exam.questions.reduce((total, question) => total + Number(question.options.some(option => option.isCorrect && selections.get(String(question._id)) === String(option._id))), 0);
  return persistResult({ attemptId: attempt._id, score, maximum: exam.questions.length });
}
async function submitAttempt({ attemptId, studentId, reason = 'Manual' }, evaluate = evaluateAttempt) {
  let attempt;
  try { attempt = await finalizeAttempt({ attemptId, studentId, reason }); }
  catch (error) {
    // A manual request crossing the deadline uses the same timeout transition.
    if (reason !== 'Manual' || error.status !== 409) throw error;
    attempt = await finalizeAttempt({ attemptId, studentId, reason: 'Timeout' });
  }
  if (attempt.evaluationStatus !== 'Evaluated') {
    try { await evaluate(attempt); }
    catch { /* Finalization is durable; the worker retries Pending evaluation. */ }
  }
  return Attempt.findById(attempt._id);
}
async function processExpiredAttempts({ evaluate = evaluateAttempt } = {}) {
  const expired = await Attempt.find({ status: 'Active', $expr: { $lte: ['$deadline', '$$NOW'] } }).select('_id studentId').limit(100);
  for (const attempt of expired) await submitAttempt({ attemptId: attempt._id, studentId: attempt.studentId, reason: 'Timeout' }, evaluate);
  const pending = await Attempt.find({ status: 'Submitted', evaluationStatus: 'Pending' }).limit(100);
  for (const attempt of pending) {
    try { await evaluate(attempt); } catch { /* Retry on the next pass; never reopen. */ }
  }
  return expired.length;
}
function startExpiryWorker({ intervalMs = Number(process.env.EXAM_EXPIRY_INTERVAL_MS || 5000), process = processExpiredAttempts } = {}) {
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 100 || intervalMs > 60000) throw new Error('EXAM_EXPIRY_INTERVAL_MS must be 100?60000');
  let running = false;
  let stopped = false;
  async function tick() {
    if (running || stopped) return;
    running = true;
    try { await process(); } catch { console.error('Exam expiry processing failed; will retry.'); }
    finally { running = false; }
  }
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  void tick();
  return () => { stopped = true; clearInterval(timer); };
}
module.exports = { evaluateAttempt, submitAttempt, processExpiredAttempts, startExpiryWorker };
