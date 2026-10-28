const express = require('express');
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Result = require('../models/Result');
const Response = require('../models/Response');
const { startAttempt, saveResponse } = require('../services/persistenceService');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { requireCsrf } = require('../middleware/csrfMiddleware');

const { submitAttempt } = require('../services/submissionService');
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
    const now = new Date();
    const exams = await Exam.find({ status: 'Published' }).select('_id title description duration startTime').sort({ startTime: 1 }).lean();
    const attempts = await Attempt.find({ studentId: req.user._id, examId: { $in: exams.map(exam => exam._id) } }).lean();
    res.json(exams.map(exam => {
      const attempt = attempts.find(value => String(value.examId) === String(exam._id));
      const attemptStatus = attempt?.status === 'Submitted' ? 'Submitted' : attempt ? (attempt.deadline <= now ? 'Expired' : 'Active') : 'Not started';
      return { ...exam, serverTime: now, attemptId: attempt?._id || null, attemptStatus,
        canStart: !attempt && (!exam.startTime || exam.startTime <= now), canResume: attemptStatus === 'Active' };
    }));
  } catch { res.status(500).json({ message: 'Could not load available exams' }); }
});
router.post('/exams/:id/start', validId, requireCsrf, async (req, res) => {
  try {
    const { attempt, exam } = await startAttempt({ examId: req.params.id, studentId: req.user._id });
    const responses = await Response.find({ attemptId: attempt._id }).select('questionId selectedOptionId revision');
    res.json({ attempt, responses, questions: questionsWithoutAnswers(exam), serverTime: new Date() });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not start exam' }); }
});
router.get('/attempts/:id', validId, async (req, res) => {
  try {
    let attempt = await Attempt.findOne({ _id: req.params.id, studentId: req.user._id });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.status === 'Active' && attempt.deadline <= new Date()) attempt = await submitAttempt({ attemptId: attempt._id, studentId: req.user._id, reason: 'Timeout' });
    const exam = await Exam.findById(attempt.examId);
    const responses = await Response.find({ attemptId: attempt._id }).select('questionId selectedOptionId revision');
    res.json({ attempt, responses, questions: exam ? questionsWithoutAnswers(exam) : [], serverTime: new Date() });
  } catch { res.status(500).json({ message: 'Could not load attempt' }); }
});
router.post('/attempts/:id/submit', validId, requireCsrf, async (req, res) => {
  if (req.body.reason !== undefined && !['Manual', 'Timeout'].includes(req.body.reason)) return res.status(400).json({ message: 'Invalid submission reason' });
  try {
    const attempt = await submitAttempt({ attemptId: req.params.id, studentId: req.user._id, reason: req.body.reason || 'Manual' });
    res.json({ attempt, serverTime: new Date() });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not submit exam' }); }
});
router.put('/attempts/:id/responses/:questionId', validId, requireCsrf, async (req, res) => {
  const { selectedOptionId, expectedRevision } = req.body;
  if (!mongoose.isObjectIdOrHexString(req.params.questionId) || !mongoose.isObjectIdOrHexString(selectedOptionId)
    || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return res.status(400).json({ message: 'Valid question, option and expectedRevision are required' });
  try {
    const response = await saveResponse({ attemptId: req.params.id, studentId: req.user._id,
      questionId: req.params.questionId, selectedOptionId, expectedRevision });
    res.json({ response, serverTime: new Date() });
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not save answer' }); }
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
