const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Response = require('../models/Response');
const Result = require('../models/Result');
const { evaluateAnswers } = require('./evaluationService');

// Explicit maintenance operation: ordinary result writes remain immutable.
// Only repair results that exactly match the old one-point-per-question algorithm.
async function repairWeightedResults({ apply = false, onChange = () => {} } = {}) {
  const summary = { checked: 0, affected: 0, updated: 0, skipped: 0 };
  for await (const candidate of Result.find().select('_id').lean().cursor()) {
    const session = await mongoose.startSession();
    let change;
    try {
      change = await session.withTransaction(async () => {
        const result = await Result.findById(candidate._id).session(session);
        if (!result) return { skipped: true };
        const attempt = await Attempt.findOne({ _id: result.attemptId, examId: result.examId, studentId: result.studentId, status: 'Submitted' }).session(session);
        const exam = await Exam.findOne({ _id: result.examId, status: 'Published' }).session(session);
        if (!attempt || !exam) return { skipped: true };
        const responses = await Response.find({ attemptId: attempt._id }).session(session);
        const weighted = evaluateAnswers(exam.questions, responses);
        if (result.score === weighted.score && result.maximum === weighted.maximumScore) return {};
        const legacy = evaluateAnswers(exam.questions.map(question => ({ ...question.toObject(), marks: 1 })), responses);
        if (result.score !== legacy.score || result.maximum !== legacy.maximumScore) return { skipped: true };
        if (apply) {
          // Native collection access is intentional here to bypass immutable score fields.
          const updated = await Result.collection.updateOne({ _id: result._id, score: result.score, maximum: result.maximum },
            { $set: { score: weighted.score, maximum: weighted.maximumScore, updatedAt: new Date() } }, { session });
          if (updated.modifiedCount !== 1) throw new Error('Result changed during repair');
        }
        return { resultId: String(result._id), before: { score: result.score, maximum: result.maximum },
          after: { score: weighted.score, maximum: weighted.maximumScore } };
      });
    } finally { await session.endSession(); }
    summary.checked++;
    if (change.skipped) summary.skipped++;
    if (change.resultId) { summary.affected++; if (apply) summary.updated++; onChange(change); }
  }
  return summary;
}

module.exports = { repairWeightedResults };
