const mongoose = require("mongoose");
const Attempt = require("../models/Attempt");
const Response = require("../models/Response");
const Exam = require("../models/Exam");
const Result = require("../models/Result");

// All answer writes must pass through this service, not direct Response writes.
// Requires a MongoDB deployment supporting transactions (replica set).
async function saveResponse({ attemptId, studentId, questionId, selectedOptionId, now = new Date() }) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const attempt = await Attempt.findOne({
        _id: attemptId, studentId, status: "Active", deadlineAt: { $gt: now },
      }).session(session);
      if (!attempt) throw new Error("Attempt unavailable, expired or already submitted");
      const exam = await Exam.findById(attempt.examId).session(session);
      if (!exam || exam.status !== "Published") throw new Error("Published exam not found");
      const question = exam.questions.id(questionId);
      if (!question) throw new Error("Question does not belong to this exam");
      if (!question.options.id(selectedOptionId)) throw new Error("Option does not belong to this question");
      const response = await Response.findOneAndUpdate(
        { attemptId: attempt._id, questionId: question._id },
        { $set: { selectedOptionId } },
        { upsert: true, new: true, runValidators: true, session }
      );
      // Force a write conflict against a concurrent finalization transaction.
      const gate = await Attempt.updateOne(
        { _id: attempt._id, status: "Active", deadlineAt: { $gt: now } },
        { $set: { updatedAt: new Date() } },
        { session }
      );
      if (gate.modifiedCount !== 1) throw new Error("Attempt expired or submitted while saving");
      return response;
    });
  } finally {
    await session.endSession();
  }
}

async function finalizeAttempt({ attemptId, studentId, reason, now = new Date() }) {
  if (!["Manual", "Timeout"].includes(reason)) throw new Error("Invalid submission reason");
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const attempt = await Attempt.findOne({ _id: attemptId, studentId }).session(session);
      if (!attempt) throw new Error("Attempt not found");
      if (attempt.status === "Submitted") return attempt;
      if (reason === "Manual" && now >= attempt.deadlineAt) throw new Error("Attempt deadline passed");
      if (reason === "Timeout" && now < attempt.deadlineAt) throw new Error("Attempt deadline not reached");
      const result = await Attempt.findOneAndUpdate(
        { _id: attempt._id, status: "Active" },
        { $set: { status: "Submitted", submittedAt: now, submissionReason: reason } },
        { new: true, runValidators: true, session }
      );
      if (!result) throw new Error("Attempt was concurrently finalized");
      return result;
    });
  } finally {
    await session.endSession();
  }
}

async function persistResult({ attemptId, score, maximumScore }) {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt || attempt.status !== "Submitted") throw new Error("Only submitted attempts can be evaluated");
  if (!Number.isInteger(score) || !Number.isInteger(maximumScore) ||
      score < 0 || maximumScore < 0 || score > maximumScore) throw new Error("Invalid score");
  const result = await Result.findOneAndUpdate(
    { attemptId },
    { $setOnInsert: { attemptId, score, maximumScore, status: "Evaluated" } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await Attempt.updateOne({ _id: attemptId, status: "Submitted" }, { $set: { evaluationStatus: "Evaluated" } });
  return result;
}

module.exports = { saveResponse, finalizeAttempt, persistResult };
