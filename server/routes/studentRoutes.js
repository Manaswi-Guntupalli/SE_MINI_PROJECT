const express = require('express');
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Result = require('../models/Result');
const Response = require('../models/Response');
const { eligible, startAttempt, saveResponse, finalizeAttempt } = require('../services/persistenceService');
const { evaluateSubmittedAttempt } = require('../services/evaluationService');
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
  try { res.json(await Exam.find(eligible(new Date())).select('_id title description duration startTime').sort({ startTime: 1 })); }
  catch { res.status(500).json({ message: 'Could not load available exams' }); }
});
router.post('/exams/:id/start', validId, requireCsrf, async (req, res) => {
  try {
    const { attempt, exam } = await startAttempt({ examId: req.params.id, studentId: req.user._id });
    const responses = await Response.find({ attemptId: attempt._id }).select('questionId selectedOptionId');
    return res.json({ attempt, questions: questionsWithoutAnswers(exam), responses });
  } catch (error) { return res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not start exam' }); }
});
router.post('/attempts/:id/responses', validId, requireCsrf, async (req, res) => {
  try {
    const { questionId, selectedOptionId } = req.body;
    if (!mongoose.isObjectIdOrHexString(String(questionId)) || !mongoose.isObjectIdOrHexString(String(selectedOptionId))) {
      return res.status(400).json({ message: 'A valid question and option are required' });
    }
    const response = await saveResponse({ attemptId: req.params.id, studentId: req.user._id, questionId, selectedOptionId });
    return res.json({ response });
  } catch (error) { return res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not save answer. Please retry.' }); }
});
router.post('/attempts/:id/submit', validId, requireCsrf, async (req, res) => {
  try {
    let attempt = await Attempt.findOne({ _id: req.params.id, studentId: req.user._id });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.status === 'Active') {
      const reason = attempt.deadline <= new Date() ? 'Timeout' : 'Manual';
      try { attempt = await finalizeAttempt({ attemptId: attempt._id, studentId: req.user._id, reason }); }
      catch (error) {
        if (reason !== 'Timeout' && attempt.deadline <= new Date()) attempt = await finalizeAttempt({ attemptId: attempt._id, studentId: req.user._id, reason: 'Timeout' });
        else throw error;
      }
    }
    const result = await evaluateSubmittedAttempt({ attemptId: attempt._id, studentId: req.user._id });
    return res.json({ attempt, result });
  } catch (error) { return res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not submit and evaluate attempt' }); }
});
router.get('/attempts/:id', validId, async (req, res) => {
  try {
    const attempt = await Attempt.findOne({ _id: req.params.id, studentId: req.user._id });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    const exam = await Exam.findById(attempt.examId).select('_id title questions');
    const responses = await Response.find({ attemptId: attempt._id }).select('questionId selectedOptionId');
    const result = await Result.findOne({ attemptId: attempt._id, studentId: req.user._id });
    return res.json({ attempt, result, exam: exam ? { _id: exam._id, title: exam.title } : null, responses, questions: exam ? questionsWithoutAnswers(exam) : [] });
  } catch { return res.status(500).json({ message: 'Could not load attempt' }); }
});
router.get('/results', async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.user._id }).sort({ createdAt: -1 }).lean();
    const exams = await Exam.find({ _id: { $in: results.map(result => result.examId) } }).select('_id title').lean();
    const titles = new Map(exams.map(exam => [String(exam._id), exam.title]));
    return res.json(results.map(result => ({ ...result, examTitle: titles.get(String(result.examId)) || 'Examination' })));
  } catch { return res.status(500).json({ message: 'Could not load results' }); }
});
router.get('/pending-results', async (req, res) => {
  try {
    const attempts = await Attempt.find({ studentId: req.user._id, status: 'Submitted', evaluationStatus: 'Pending' })
      .select('_id examId submittedAt evaluationStatus').populate('examId', 'title').sort({ submittedAt: -1 }).lean();
    return res.json(attempts.map(attempt => ({
      _id: attempt._id, examTitle: attempt.examId?.title || 'Examination',
      submittedAt: attempt.submittedAt, status: 'Evaluation pending',
    })));
  } catch { return res.status(500).json({ message: 'Could not load pending results' }); }
});
router.get('/results/:id', validId, async (req, res) => {
  try {
    const result = await Result.findOne({ _id: req.params.id, studentId: req.user._id });
    if (!result) return res.status(404).json({ message: 'Result not found' });
    const exam = await Exam.findById(result.examId).select('_id title');
    return res.json({ ...result.toObject(), examTitle: exam?.title || 'Examination' });
  } catch { return res.status(500).json({ message: 'Could not load result' }); }
});
module.exports = router;
