const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateAnswers } = require("../services/evaluationService");

const questions = [
  { _id: "q1", options: [{ _id: "a1", isCorrect: true }, { _id: "b1", isCorrect: false }] },
  { _id: "q2", options: [{ _id: "a2", isCorrect: false }, { _id: "b2", isCorrect: true }] },
  { _id: "q3", options: [{ _id: "a3", isCorrect: true }, { _id: "b3", isCorrect: false }] },
];

test("All correct answers give full marks", () => {
  assert.deepEqual(evaluateAnswers(questions, [
    { questionId: "q1", selectedOptionId: "a1" },
    { questionId: "q2", selectedOptionId: "b2" },
    { questionId: "q3", selectedOptionId: "a3" },
  ]), { score: 3, maximumScore: 3 });
});
test("All wrong answers give zero marks", () => {
  assert.deepEqual(evaluateAnswers(questions, [
    { questionId: "q1", selectedOptionId: "b1" },
    { questionId: "q2", selectedOptionId: "a2" },
    { questionId: "q3", selectedOptionId: "b3" },
  ]), { score: 0, maximumScore: 3 });
});
test("Mixed and unanswered questions award only correct marks", () => {
  assert.deepEqual(evaluateAnswers(questions, [
    { questionId: "q1", selectedOptionId: "a1" },
    { questionId: "q2", selectedOptionId: "a2" },
  ]), { score: 1, maximumScore: 3 });
});
test("Duplicate answers are rejected", () => {
  assert.throws(() => evaluateAnswers(questions, [
    { questionId: "q1", selectedOptionId: "a1" },
    { questionId: "q1", selectedOptionId: "b1" },
  ]), /Duplicate answer/);
});
test("Invalid published answer key is rejected", () => {
  assert.throws(() => evaluateAnswers([{ _id: "q1", options: [] }], []), /exactly one correct option/);
});
