const Exam = require("../models/Exam");

const createExam = async (req, res) => {
  try {
    const exam = await Exam.create({
      ...req.body,
      status: "Draft",
    });

    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getInstructorExams = async (req, res) => {
  try {
    const exams = await Exam.find({
      instructorId: req.params.instructorId,
    }).sort({ createdAt: -1 });

    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status !== "Draft") {
      return res
        .status(400)
        .json({ message: "Published exams cannot be edited" });
    }

    Object.assign(exam, req.body);
    await exam.save();

    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status !== "Draft") {
      return res
        .status(400)
        .json({ message: "Published exams cannot be deleted" });
    }

    await exam.deleteOne();

    res.json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const addQuestion = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status !== "Draft") {
      return res
        .status(400)
        .json({ message: "Questions cannot be changed after publication" });
    }

    const { questionText, options, marks } = req.body;

    const correctCount = options.filter(
      (option) => option.isCorrect === true
    ).length;

    if (correctCount !== 1) {
      return res.status(400).json({
        message: "Each MCQ must have exactly one correct option",
      });
    }

    exam.questions.push({
      questionText,
      options,
      marks,
    });

    await exam.save();

    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status !== "Draft") {
      return res
        .status(400)
        .json({ message: "Questions cannot be changed after publication" });
    }

    const question = exam.questions.id(req.params.questionId);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const { questionText, options, marks } = req.body;

    if (options) {
      const correctCount = options.filter(
        (option) => option.isCorrect === true
      ).length;

      if (correctCount !== 1) {
        return res.status(400).json({
          message: "Each MCQ must have exactly one correct option",
        });
      }

      question.options = options;
    }

    if (questionText !== undefined) {
      question.questionText = questionText;
    }

    if (marks !== undefined) {
      question.marks = marks;
    }

    await exam.save();

    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status !== "Draft") {
      return res
        .status(400)
        .json({ message: "Questions cannot be changed after publication" });
    }

    const question = exam.questions.id(req.params.questionId);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    question.deleteOne();

    await exam.save();

    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const publishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status === "Published") {
      return res.status(400).json({ message: "Exam is already published" });
    }

    if (exam.questions.length === 0) {
      return res.status(400).json({
        message: "An exam must contain at least one question before publication",
      });
    }

    for (const question of exam.questions) {
      const correctCount = question.options.filter(
        (option) => option.isCorrect
      ).length;

      if (correctCount !== 1) {
        return res.status(400).json({
          message: "Every question must have exactly one correct option",
        });
      }
    }

    exam.status = "Published";
    await exam.save();

    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createExam,
  getInstructorExams,
  getExamById,
  updateExam,
  deleteExam,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  publishExam,
};