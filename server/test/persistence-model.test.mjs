import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const User = require("../models/User");
const Attempt = require("../models/Attempt");
const Response = require("../models/Response");
const Result = require("../models/Result");
const { saveResponse, finalizeAttempt, persistResult } = require("../services/persistenceService");
const id = () => new (require("mongoose").Types.ObjectId)();

describe("OEP-43 model validation and index definitions", () => {
  it("rejects invalid roles and normalizes login identifiers", () => {
    const user = new User({ loginIdentifier: "  Student@Example.COM ", passwordHash: "hash", role: "Student" });
    expect(user.validateSync()).toBeUndefined();
    expect(user.loginIdentifier).toBe("student@example.com");
    expect(new User({ loginIdentifier: "x", passwordHash: "hash", role: "Owner" }).validateSync()).toBeDefined();
  });

  it("enforces a unique student/exam pair in index declarations", () => {
    expect(Attempt.schema.indexes()).toEqual(expect.arrayContaining([
      [{ studentId: 1, examId: 1 }, expect.objectContaining({ unique: true })],
    ]));
  });

  it("rejects reversed deadlines and inconsistent submission metadata", () => {
    const base = { studentId: id(), examId: id(), startedAt: new Date("2026-10-01"), deadlineAt: new Date("2026-09-30") };
    expect(new Attempt(base).validateSync()).toBeDefined();
    expect(new Attempt({ ...base, deadlineAt: new Date("2026-10-02"), status: "Submitted" }).validateSync()).toBeDefined();
  });

  it("defines one response per attempt/question", () => {
    expect(Response.schema.indexes()).toEqual(expect.arrayContaining([
      [{ attemptId: 1, questionId: 1 }, expect.objectContaining({ unique: true })],
    ]));
  });

  it("rejects scores exceeding the maximum and duplicate result index declarations", () => {
    expect(new Result({ attemptId: id(), score: 2, maximumScore: 1 }).validateSync()).toBeDefined();
    expect(Result.schema.indexes()).toEqual(expect.arrayContaining([
      [{ attemptId: 1 }, expect.objectContaining({ unique: true })],
    ]));
  });

  it("exposes guarded persistence entry points", () => {
    expect(typeof saveResponse).toBe("function");
    expect(typeof finalizeAttempt).toBe("function");
    expect(typeof persistResult).toBe("function");
  });
});
