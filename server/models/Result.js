const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true, unique: true, immutable: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, immutable: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  score: { type: Number, required: true, min: 0, immutable: true, validate: {
    validator(value) { return Number.isFinite(value) && value <= this.maximum; }, message: 'Score must be finite and within the maximum',
  } },
  maximum: { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER, immutable: true, validate: Number.isFinite },
  status: { type: String, enum: ['Evaluated'], default: 'Evaluated', required: true, immutable: true },
}, { timestamps: true });
schema.index({ studentId: 1, createdAt: -1 });
schema.index({ examId: 1 });
module.exports = mongoose.model('Result', schema);
