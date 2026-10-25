const mongoose = require('mongoose');

// Canonical fields shared by authentication, Instructor and persistence branches.
const schema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, immutable: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  startedAt: { type: Date, required: true, immutable: true },
  deadline: { type: Date, required: true, immutable: true, validate: {
    validator(value) { return value > this.startedAt; }, message: 'Deadline must be later than start time',
  } },
  status: { type: String, enum: ['Active', 'Submitted'], default: 'Active', required: true, validate: {
    validator(value) { return value !== 'Active' || (!this.submittedAt && !this.submissionReason && this.evaluationStatus === 'Pending'); },
    message: 'Active attempts cannot have submission metadata or evaluation results',
  } },
  submittedAt: { type: Date, default: null, validate: {
    validator(value) { return this.status !== 'Submitted' || (!!value && !!this.submissionReason && value >= this.startedAt); },
    message: 'Submitted attempts require a timestamp and reason',
  } },
  submissionReason: { type: String, enum: ['Manual', 'Timeout', null], default: null },
  evaluationStatus: { type: String, enum: ['Pending', 'Evaluated'], default: 'Pending', required: true },
  writeVersion: { type: Number, default: 0 },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ studentId: 1, examId: 1 }, { unique: true });
schema.index({ status: 1, deadline: 1 });
module.exports = mongoose.model('Attempt', schema);
