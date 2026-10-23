const express = require("express");

const {
  createExam,
  getInstructorExams,
  getExamById,
  updateExam,
  deleteExam,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  publishExam,
} = require("../controllers/examController");

const router = express.Router();

router.post("/", createExam);

router.get("/instructor/:instructorId", getInstructorExams);

router.get("/:id", getExamById);

router.put("/:id", updateExam);

router.delete("/:id", deleteExam);

router.post("/:id/questions", addQuestion);

router.put(
  "/:examId/questions/:questionId",
  updateQuestion
);

router.delete(
  "/:examId/questions/:questionId",
  deleteQuestion
);

router.post("/:id/publish", publishExam);

module.exports = router;