const mongoose = require('mongoose');

// The publication handoff stores the deadline once; clients cannot supply identity or time.
const schema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Submitted', 'Evaluated'], default: 'Active' },
  responses: [{ questionId: mongoose.Schema.Types.ObjectId, selectedOptionId: mongoose.Schema.Types.ObjectId }],
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ examId: 1, studentId: 1 }, { unique: true });
module.exports = mongoose.model('Attempt', schema);
