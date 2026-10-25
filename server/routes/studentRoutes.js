const express = require('express');
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Result = require('../models/Result');
const Response = require('../models/Response');
const { eligible, startAttempt } = require('../services/persistenceService');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireCsrf } = require('../middleware/csrfMiddleware');

const router = express.Router();
router.use(requireAuth, requireRole('Student'));
const validId = (req, res, next) => mongoose.isObjectIdOrHexString(req.params.id)
  ? next() : res.status(400).json({ message: 'Invalid resource identifier' });
const questionsWithoutAnswers = exam => exam.questions.map(question => ({
  _id: question._id, questionText: question.questionText,
  options: question.options.map(option => ({ _id: option._id, text: option.text })),
}));

router.get('/exams', async (req, res) => {
  try {
    // Explicit allowlist prevents authoring metadata or answer keys from leaking.
    res.json(await Exam.find(eligible(new Date())).select('_id title description duration startTime').sort({ startTime: 1 }));
  } catch { res.status(500).json({ message: 'Could not load available exams' }); }
});
router.post('/exams/:id/start', validId, requireCsrf, async (req, res) => {
  try {
    const { attempt, exam } = await startAttempt({ examId: req.params.id, studentId: req.user._id });
    res.json({ attempt, questions: questionsWithoutAnswers(exam) });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not start exam' }); }
});
router.get('/attempts/:id', validId, async (req, res) => {
  try {
    const attempt = await Attempt.findOne({ _id: req.params.id, studentId: req.user._id });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    const exam = await Exam.findById(attempt.examId);
    const responses = await Response.find({ attemptId: attempt._id }).select('questionId selectedOptionId');
    res.json({ attempt, responses, questions: exam ? questionsWithoutAnswers(exam) : [] });
  } catch { res.status(500).json({ message: 'Could not load attempt' }); }
});
router.get('/results', async (req, res) => {
  try { res.json(await Result.find({ studentId: req.user._id })); }
  catch { res.status(500).json({ message: 'Could not load results' }); }
});
router.get('/results/:id', validId, async (req, res) => {
  try {
    const result = await Result.findOne({ _id: req.params.id, studentId: req.user._id });
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json(result);
  } catch { res.status(500).json({ message: 'Could not load result' }); }
});
module.exports = router;
