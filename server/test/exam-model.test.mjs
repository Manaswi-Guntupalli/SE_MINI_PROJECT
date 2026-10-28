import mongoose from 'mongoose';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const Exam = require('../models/Exam');

const instructorId = new mongoose.Types.ObjectId();

const validExam = () => ({
  title: '  Algorithms Quiz  ',
  instructorId,
  startTime: '2026-10-24T12:00:00.000Z',
  duration: 30,
});

describe('Exam schema: Release 1 validation', () => {
  it('UT-EXAM-01: creates a draft with trimmed text and an empty question list', () => {
    const exam = new Exam(validExam());

    expect(exam.validateSync()).toBeUndefined();
    expect(exam.title).toBe('Algorithms Quiz');
    expect(exam.status).toBe('Draft');
    expect(exam.questions).toHaveLength(0);
  });

  it.each(['', '   '])(
    'UT-EXAM-02: rejects blank title %j',
    (title) => {
      expect(
        new Exam({
          ...validExam(),
          title,
        }).validateSync()?.errors.title
      ).toBeDefined();
    }
  );

  it.each([0, -5])(
    'UT-EXAM-03: rejects duration %s',
    (duration) => {
      expect(
        new Exam({
          ...validExam(),
          duration,
        }).validateSync()?.errors.duration
      ).toBeDefined();
    }
  );

  it('UT-EXAM-04: rejects a status outside the draft/publication lifecycle', () => {
    expect(
      new Exam({
        ...validExam(),
        status: 'Unknown',
      }).validateSync()?.errors.status
    ).toBeDefined();
  });

  it('UT-MCQ-01: permits incomplete option data while an exam remains a draft', () => {
    const exam = new Exam({
      ...validExam(),
      questions: [
        {
          questionText: 'Draft question',
          options: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
          ],
        },
      ],
    });

    expect(exam.validateSync()).toBeUndefined();
    expect(exam.status).toBe('Draft');
    expect(exam.questions[0].options).toHaveLength(2);
  });

  it('UT-MCQ-02: still requires nonblank question text', () => {
    const exam = new Exam({
      ...validExam(),
      questions: [
        {
          questionText: '   ',
          options: [],
        },
      ],
    });

    expect(
      exam.validateSync()?.errors[
        'questions.0.questionText'
      ]
    ).toBeDefined();
  });

  it('UT-MCQ-03: gives embedded questions and options distinct identifiers', () => {
    const exam = new Exam({
      ...validExam(),
      questions: [
        {
          questionText: '2 + 2?',
          options: [
            { text: '4', isCorrect: true },
            { text: '5', isCorrect: false },
          ],
        },
      ],
    });

    expect(exam.validateSync()).toBeUndefined();

    const question = exam.questions[0];

    expect(String(question._id)).not.toBe(
      String(question.options[0]._id)
    );

    expect(String(question.options[0]._id)).not.toBe(
      String(question.options[1]._id)
    );
  });
});