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

test('A correct five-mark question awards five marks', () => {
  assert.deepEqual(evaluateAnswers([{ ...questions[0], marks: 5 }], [
    { questionId: 'q1', selectedOptionId: 'a1' },
  ]), { score: 5, maximumScore: 5 });
});

test('Mixed weights include wrong and unanswered questions in the maximum', () => {
  const weighted = questions.map((question, index) => ({ ...question, marks: [5, 2.5, 3][index] }));
  assert.deepEqual(evaluateAnswers(weighted, [
    { questionId: 'q1', selectedOptionId: 'a1' },
    { questionId: 'q2', selectedOptionId: 'a2' },
  ]), { score: 5, maximumScore: 10.5 });
  assert.deepEqual(evaluateAnswers(weighted, []), { score: 0, maximumScore: 10.5 });
  assert.deepEqual(evaluateAnswers(weighted, weighted.map(question => ({
    questionId: question._id, selectedOptionId: question.options.find(option => option.isCorrect)._id,
  }))), { score: 10.5, maximumScore: 10.5 });
});

test('Invalid weights and overflowing totals are rejected instead of misgrading', () => {
  for (const marks of [null, 0, -1, NaN, Infinity, '5', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => evaluateAnswers([{ ...questions[0], marks }], []), /Question marks/);
  }
  assert.throws(() => evaluateAnswers(questions.map(question => ({ ...question, marks: Number.MAX_SAFE_INTEGER })), []), /Total marks/);
});

test('Decimal marks produce clean totals without floating point drift', () => {
  const weighted = questions.map((question, index) => ({ ...question, marks: [1.1, 1.2, 1.3][index] }));
  assert.deepEqual(evaluateAnswers(weighted, weighted.map(question => ({
    questionId: question._id, selectedOptionId: question.options.find(option => option.isCorrect)._id,
  }))), { score: 3.6, maximumScore: 3.6 });
});
