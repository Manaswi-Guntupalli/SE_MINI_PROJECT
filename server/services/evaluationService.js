
"use strict";

function evaluateAnswers(questions, answers) {
  if (!Array.isArray(questions) || !Array.isArray(answers)) {
    throw new Error("Questions and answers must be arrays");
  }

  const answerMap = new Map();

  for (const answer of answers) {
    const questionId = String(answer.questionId);

    if (answerMap.has(questionId)) {
      throw new Error("Duplicate answer for a question");
    }

    answerMap.set(questionId, String(answer.selectedOptionId));
  }

  let score = 0;

  for (const question of questions) {
    const correctOptions = question.options.filter(
      (option) => option.isCorrect === true
    );

    if (correctOptions.length !== 1) {
      throw new Error("Invalid published answer key");
    }

    const correctOptionId = String(correctOptions[0]._id);
    const selectedOptionId = answerMap.get(String(question._id));

    if (selectedOptionId === correctOptionId) {
      score += 1;
    }
  }

  return {
    score,
    maximumScore: questions.length,
  };
}

module.exports = { evaluateAnswers };
