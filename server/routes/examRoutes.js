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

const {
  requireAuth,
  requireRole,
} = require("../middleware/authMiddleware");

const {
  requireCsrf,
} = require("../middleware/csrfMiddleware");

const router = express.Router();

// Every exam-management operation requires an authenticated Instructor.
// Admin is intentionally NOT included because OEP-15 says Admin status
// does not automatically grant Instructor workflow permissions.
router.use(requireAuth);
router.use(requireRole("Instructor"));

// Instructor's own exams
router.get("/mine", getInstructorExams);

router.get('/:id/results', async (req, res) => {
  try {
    const Exam = require('../models/Exam');
    const Result = require('../models/Result');
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    if (String(exam.instructorId) !== String(req.user._id)) return res.status(403).json({ message: 'Access denied' });
    res.json(await Result.find({ examId: exam._id }));
  } catch { res.status(400).json({ message: 'Could not load exam results' }); }
});

// Create draft exam
router.post("/", requireCsrf, createExam);

// Read/manage one owned exam
router.get("/:id", getExamById);

router.put("/:id", requireCsrf, updateExam);

router.delete("/:id", requireCsrf, deleteExam);

// Manage questions on owned draft exam
router.post(
  "/:id/questions",
  requireCsrf,
  addQuestion
);

router.put(
  "/:examId/questions/:questionId",
  requireCsrf,
  updateQuestion
);

router.delete(
  "/:examId/questions/:questionId",
  requireCsrf,
  deleteQuestion
);

// Publish owned draft
router.post(
  "/:id/publish",
  requireCsrf,
  publishExam
);

module.exports = router;
