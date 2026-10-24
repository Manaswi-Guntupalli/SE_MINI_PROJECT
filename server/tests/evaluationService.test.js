
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  evaluateAnswers,
} = require("../services/evaluationService");

const questions = [
  {
    _id: "q1",
    options: [
      { _id: "a1", isCorrect: true },
      { _id: "b1", isCorrect: false },
    ],
  },
  {
    _id: "q2",
    options: [
      { _id: "a2", isCorrect: false },
      { _id: "b2", isCorrect: true },
    ],
  },
  {
    _id: "q3",
    options: [
      { _id: "a3", isCorrect: true },
      { _id: "b3", isCorrect: false },
    ],
  },
];

test("All correct answers give full marks", () => {
  const answers = [
    { questionId: "q1", selectedOptionId: "a1" },
    { questionId: "q2", selectedOptionId: "b2" },
    { questionId: "q3", selectedOptionId: "a3" },
  ];

  assert.deepEqual(evaluateAnswers(questions, answers), {
    score: 3,
    maximumScore: 3,
  });
});

test("All wrong answers give zero marks", () => {
  const answers = [
    { questionId: "q1", selectedOptionId: "b1" },
    { questionId: "q2", selectedOptionId: "a2" },
    { questionId: "q3", selectedOptionId: "b3" },
  ];

  assert.deepEqual(evaluateAnswers(questions, answers), {
    score: 0,
    maximumScore: 3,
  });
});

test("Mixed and unanswered questions", () => {
  const answers = [
    { questionId: "q1", selectedOptionId: "a1" },
    { questionId: "q2", selectedOptionId: "a2" },
  ];

  assert.deepEqual(evaluateAnswers(questions, answers), {
    score: 1,
    maximumScore: 3,
  });
});

test("Duplicate answers are rejected", () => {
  const answers = [
    { questionId: "q1", selectedOptionId: "a1" },
    { questionId: "q1", selectedOptionId: "b1" },
  ];

  assert.throws(
    () => evaluateAnswers(questions, answers),
    /Duplicate answer/
  );
});
