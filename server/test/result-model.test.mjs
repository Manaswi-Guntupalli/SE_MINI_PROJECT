
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import Result from "../models/Result.js";
import {
  connectTestDatabase,
  closeTestDatabase,
} from "./database.mjs";

beforeAll(async () => {
  await connectTestDatabase();
  await Result.init();
});

afterAll(async () => {
  await closeTestDatabase();
});

describe("Result Model - Automatic MCQ Evaluation", () => {
  const createResult = (score, maximumScore) =>
    new Result({
      attemptId: new mongoose.Types.ObjectId(),
      examId: new mongoose.Types.ObjectId(),
      score,
      maximumScore,
    });

  it("accepts a valid score", () => {
    expect(createResult(8, 10).validateSync()).toBeUndefined();
  });

  it("rejects a score greater than maximum score", () => {
    expect(createResult(15, 10).validateSync()).toBeDefined();
  });

  it("accepts a zero score", () => {
    expect(createResult(0, 10).validateSync()).toBeUndefined();
  });

  it("rejects a negative score", () => {
    expect(createResult(-1, 10).validateSync()).toBeDefined();
  });

  it("sets status to Evaluated by default", () => {
    expect(createResult(5, 10).status).toBe("Evaluated");
  });

  it("rejects decimal scores", () => {
    expect(createResult(5.5, 10).validateSync()).toBeDefined();
  });

  it("saves a result to MongoDB", async () => {
    const result = await createResult(8, 10).save();

    const savedResult = await Result.findById(result._id);

    expect(savedResult).not.toBeNull();
    expect(savedResult.score).toBe(8);
    expect(savedResult.maximumScore).toBe(10);
    expect(savedResult.status).toBe("Evaluated");
  });

  it("prevents duplicate results for the same attempt", async () => {
    const attemptId = new mongoose.Types.ObjectId();
    const examId = new mongoose.Types.ObjectId();

    await Result.create({
      attemptId,
      examId,
      score: 7,
      maximumScore: 10,
    });

    await expect(
      Result.create({
        attemptId,
        examId,
        score: 9,
        maximumScore: 10,
      })
    ).rejects.toMatchObject({ code: 11000 });
  });
});
