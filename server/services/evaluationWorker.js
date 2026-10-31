const Attempt = require('../models/Attempt');
const { evaluateSubmittedAttempt } = require('./evaluationService');

// Each attempt is isolated: a failed evaluation stays submitted and is retried
// on the next sweep. Database transactions/unique indexes also protect replicas.
async function processPendingEvaluations({ onError = console.error } = {}) {
  const attempts = Attempt.find({ $or: [
    { status: 'Active', $expr: { $lte: ['$deadline', '$$NOW'] } },
    { status: 'Submitted', evaluationStatus: 'Pending' },
  ] }).select('_id studentId').cursor();
  for await (const attempt of attempts) {
    try {
      await evaluateSubmittedAttempt({ attemptId: attempt._id, studentId: attempt.studentId });
    } catch (error) {
      onError('Attempt evaluation will be retried', String(attempt._id), error);
    }
  }
}

function startEvaluationWorker({ intervalMs = Number(process.env.EXAM_EXPIRY_INTERVAL_MS || 5000), onError = console.error } = {}) {
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 100 || intervalMs > 60000) throw new Error('EXAM_EXPIRY_INTERVAL_MS must be 100–60000');
  let stopped = false;
  let timer;
  const run = async () => {
    try { await processPendingEvaluations({ onError }); }
    catch (error) { onError('Evaluation sweep failed; will retry', error); }
    if (!stopped) {
      timer = setTimeout(run, intervalMs);
      timer.unref?.();
    }
  };
  const done = run();
  return { stop() { stopped = true; clearTimeout(timer); }, done };
}

module.exports = { processPendingEvaluations, startEvaluationWorker };
