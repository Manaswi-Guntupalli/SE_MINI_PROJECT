const Exam = require("../models/Exam");

const ownsExam = (exam, user) => {
  return exam.instructorId.toString() === user._id.toString();
};

const validateExamFields = ({ title, duration, startTime }) => {
  const errors = [];

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      errors.push("Title must not be blank");
    }
  }

  if (duration !== undefined) {
    const numericDuration = Number(duration);

    if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
      errors.push("Duration must be a finite positive number");
    }
  }

  if (
    startTime !== undefined &&
    startTime !== null &&
    startTime !== "" &&
    Number.isNaN(new Date(startTime).getTime())
  ) {
    errors.push("Start time must be a valid date and time");
  }

  return errors;
};

const getOwnedExam = async (examId, user) => {
  const exam = await Exam.findById(examId);

  if (!exam) {
    return {
      error: {
        status: 404,
        message: "Exam not found",
      },
    };
  }

  if (!ownsExam(exam, user)) {
    return {
      error: {
        status: 403,
        message: "Access denied",
      },
    };
  }

  return { exam };
};

const createExam = async (req, res) => {
  try {
    const { title, description, startTime, duration } = req.body;

    const errors = validateExamFields({
      title,
      duration,
      startTime,
    });

    if (title === undefined) {
      errors.push("Title is required");
    }

    if (duration === undefined) {
      errors.push("Duration is required");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Invalid exam data",
        errors,
      });
    }

    const exam = await Exam.create({
      title: title.trim(),
      description:
        typeof description === "string" ? description.trim() : "",
      startTime:
        startTime === undefined || startTime === null || startTime === ""
          ? null
          : new Date(startTime),
      duration: Number(duration),

      // Ownership comes ONLY from the authenticated session.
      instructorId: req.user._id,

      status: "Draft",
      questions: [],
    });

    return res.status(201).json(exam);
  } catch (error) {
    return res.status(400).json({
      message: "Could not create exam",
      error: error.message,
    });
  }
};

const getInstructorExams = async (req, res) => {
  try {
    const exams = await Exam.find({
      instructorId: req.user._id,
    }).sort({ createdAt: -1 });

    return res.json(exams);
  } catch (error) {
    return res.status(500).json({
      message: "Could not retrieve exams",
    });
  }
};

const getExamById = async (req, res) => {
  try {
    const result = await getOwnedExam(req.params.id, req.user);

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    return res.json(result.exam);
  } catch (error) {
    return res.status(400).json({
      message: "Could not retrieve exam",
    });
  }
};

const updateExam = async (req, res) => {
  try {
    const result = await getOwnedExam(req.params.id, req.user);

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    const exam = result.exam;

    if (exam.status !== "Draft") {
      return res.status(400).json({
        message: "Published exams cannot be edited",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "startTime",
      "duration",
    ];

    const suppliedFields = Object.keys(req.body);

    const unsupportedFields = suppliedFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
      return res.status(400).json({
        message: "Only draft exam details may be edited",
      });
    }

    const errors = validateExamFields(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Invalid exam data",
        errors,
      });
    }

    if (req.body.title !== undefined) {
      exam.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      exam.description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";
    }

    if (req.body.duration !== undefined) {
      exam.duration = Number(req.body.duration);
    }

    if (req.body.startTime !== undefined) {
      exam.startTime =
        req.body.startTime === null || req.body.startTime === ""
          ? null
          : new Date(req.body.startTime);
    }

    await exam.save();

    return res.json(exam);
  } catch (error) {
    return res.status(400).json({
      message: "Could not update exam",
      error: error.message,
    });
  }
};

const deleteExam = async (req, res) => {
  try {
    const result = await getOwnedExam(req.params.id, req.user);

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    const exam = result.exam;

    if (exam.status !== "Draft") {
      return res.status(400).json({
        message: "Published exams cannot be deleted",
      });
    }

    await exam.deleteOne();

    return res.json({
      message: "Exam deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      message: "Could not delete exam",
    });
  }
};

const addQuestion = async (req, res) => {
  try {
    const result = await getOwnedExam(req.params.id, req.user);

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    const exam = result.exam;

    if (exam.status !== "Draft") {
      return res.status(400).json({
        message: "Questions cannot be changed after publication",
      });
    }

    const {
      questionText = "",
      options = [],
      marks = 1,
    } = req.body;

    if (
      typeof questionText !== "string" ||
      !questionText.trim()
    ) {
      return res.status(400).json({
        message: "Question text must not be blank",
      });
    }

    if (!Array.isArray(options)) {
      return res.status(400).json({
        message: "Options must be an array",
      });
    }

    const normalizedOptions = options.map((option) => ({
      text:
        typeof option.text === "string"
          ? option.text.trim()
          : "",
      isCorrect: option.isCorrect === true,
    }));

    const numericMarks = Number(marks);

    if (!Number.isFinite(numericMarks) || numericMarks < 1) {
      return res.status(400).json({
        message: "Marks must be a positive number",
      });
    }

    exam.questions.push({
      questionText: questionText.trim(),
      options: normalizedOptions,
      marks: numericMarks,
    });

    await exam.save();

    return res.status(201).json(exam);
  } catch (error) {
    return res.status(400).json({
      message: "Could not add question",
      error: error.message,
    });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const result = await getOwnedExam(
      req.params.examId,
      req.user
    );

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    const exam = result.exam;

    if (exam.status !== "Draft") {
      return res.status(400).json({
        message: "Questions cannot be changed after publication",
      });
    }

    const question = exam.questions.id(
      req.params.questionId
    );

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    const allowedFields = [
      "questionText",
      "options",
      "marks",
    ];

    const unsupportedFields = Object.keys(req.body).filter(
      (field) => !allowedFields.includes(field)
    );

    if (unsupportedFields.length > 0) {
      return res.status(400).json({
        message: "Invalid question update",
      });
    }

    if (req.body.questionText !== undefined) {
      if (
        typeof req.body.questionText !== "string" ||
        !req.body.questionText.trim()
      ) {
        return res.status(400).json({
          message: "Question text must not be blank",
        });
      }

      question.questionText =
        req.body.questionText.trim();
    }

    if (req.body.options !== undefined) {
      if (!Array.isArray(req.body.options)) {
        return res.status(400).json({
          message: "Options must be an array",
        });
      }

      question.options = req.body.options.map(
        (option) => ({
          text:
            typeof option.text === "string"
              ? option.text.trim()
              : "",
          isCorrect: option.isCorrect === true,
        })
      );
    }

    if (req.body.marks !== undefined) {
      const numericMarks = Number(req.body.marks);

      if (
        !Number.isFinite(numericMarks) ||
        numericMarks < 1
      ) {
        return res.status(400).json({
          message: "Marks must be a positive number",
        });
      }

      question.marks = numericMarks;
    }

    await exam.save();

    return res.json(exam);
  } catch (error) {
    return res.status(400).json({
      message: "Could not update question",
      error: error.message,
    });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const result = await getOwnedExam(
      req.params.examId,
      req.user
    );

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    const exam = result.exam;

    if (exam.status !== "Draft") {
      return res.status(400).json({
        message: "Questions cannot be changed after publication",
      });
    }

    const question = exam.questions.id(
      req.params.questionId
    );

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    question.deleteOne();

    await exam.save();

    return res.json(exam);
  } catch (error) {
    return res.status(400).json({
      message: "Could not delete question",
    });
  }
};

const publishExam = async (req, res) => {
  try {
    const result = await getOwnedExam(req.params.id, req.user);

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ message: result.error.message });
    }

    const exam = result.exam;

    if (exam.status === "Published") {
      return res.status(400).json({
        message: "Exam is already published",
      });
    }

    const errors = [];

    if (!exam.title || !exam.title.trim()) {
      errors.push("Exam title must not be blank");
    }

    if (
      !Number.isFinite(exam.duration) ||
      exam.duration <= 0
    ) {
      errors.push(
        "Exam duration must be a finite positive number"
      );
    }

    if (exam.questions.length === 0) {
      errors.push(
        "Exam must contain at least one question"
      );
    }

    exam.questions.forEach((question, index) => {
      const questionNumber = index + 1;

      if (
        !question.questionText ||
        !question.questionText.trim()
      ) {
        errors.push(
          `Question ${questionNumber} text must not be blank`
        );
      }

      if (question.options.length < 2) {
        errors.push(
          `Question ${questionNumber} must have at least two options`
        );
        return;
      }

      const blankOption = question.options.some(
        (option) => !option.text || !option.text.trim()
      );

      if (blankOption) {
        errors.push(
          `Question ${questionNumber} contains a blank option`
        );
      }

      const correctOptions = question.options.filter(
        (option) => option.isCorrect === true
      );

      if (correctOptions.length !== 1) {
        errors.push(
          `Question ${questionNumber} must have exactly one correct option`
        );
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message: "Exam cannot be published",
        errors,
      });
    }

    exam.status = "Published";

    await exam.save();

    return res.json(exam);
  } catch (error) {
    return res.status(400).json({
      message: "Could not publish exam",
      error: error.message,
    });
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