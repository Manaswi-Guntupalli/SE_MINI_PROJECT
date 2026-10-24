import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");
const Response = require("../models/Response");
const Result = require("../models/Result");
const { saveResponse, finalizeAttempt, persistResult } = require("../services/persistenceService");

let replica;
let studentId;
let exam;
let attempt;
const question = () => ({ questionText: "2 + 2?", options: [{ text: "4", isCorrect: true }, { text: "5" }] });

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" }, binary: { version: "8.0.17" } });
  await mongoose.connect(replica.getUri());
  await Promise.all([Exam.init(), Attempt.init(), Response.init(), Result.init()]);
  studentId = new mongoose.Types.ObjectId();
  exam = await Exam.create({ title: "Integration", instructorId: "instructor", startTime: new Date(), duration: 30, status: "Published", questions: [question()] });
  attempt = await Attempt.create({ studentId, examId: exam._id, startedAt: new Date(Date.now() - 1000), deadlineAt: new Date(Date.now() + 60000) });
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replica) await replica.stop();
});

describe("OEP-43 real MongoDB persistence", () => {
  it("rejects duplicate attempts via database unique index", async () => {
    await expect(Attempt.create({ studentId, examId: exam._id, startedAt: new Date(), deadlineAt: new Date(Date.now() + 60000) })).rejects.toMatchObject({ code: 11000 });
  });
  it("rejects questions and options outside the exam", async () => {
    await expect(saveResponse({ attemptId: attempt._id, studentId, questionId: new mongoose.Types.ObjectId(), selectedOptionId: exam.questions[0].options[0]._id })).rejects.toThrow("Question does not belong");
    await expect(saveResponse({ attemptId: attempt._id, studentId, questionId: exam.questions[0]._id, selectedOptionId: new mongoose.Types.ObjectId() })).rejects.toThrow("Option does not belong");
  });
  it("persists only one response per attempt/question and updates its selection", async () => {
    const q = exam.questions[0];
    await saveResponse({ attemptId: attempt._id, studentId, questionId: q._id, selectedOptionId: q.options[0]._id });
    await saveResponse({ attemptId: attempt._id, studentId, questionId: q._id, selectedOptionId: q.options[1]._id });
    expect(await Response.countDocuments({ attemptId: attempt._id, questionId: q._id })).toBe(1);
    expect(String((await Response.findOne({ attemptId: attempt._id })).selectedOptionId)).toBe(String(q.options[1]._id));
  });
  it("finalizes once, rejects late answers, and persists an idempotent result", async () => {
    const submitted = await finalizeAttempt({ attemptId: attempt._id, studentId, reason: "Manual" });
    expect(submitted.status).toBe("Submitted");
    const repeated = await finalizeAttempt({ attemptId: attempt._id, studentId, reason: "Manual" });
    expect(repeated.status).toBe("Submitted");
    await expect(saveResponse({ attemptId: attempt._id, studentId, questionId: exam.questions[0]._id, selectedOptionId: exam.questions[0].options[0]._id })).rejects.toThrow();
    const first = await persistResult({ attemptId: attempt._id, score: 1, maximumScore: 1 });
    const second = await persistResult({ attemptId: attempt._id, score: 0, maximumScore: 1 });
    expect(String(first._id)).toBe(String(second._id));
    expect(await Result.countDocuments({ attemptId: attempt._id })).toBe(1);
    expect((await Attempt.findById(attempt._id)).evaluationStatus).toBe("Evaluated");
  });
});
