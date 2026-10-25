const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true, unique: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, required: true, min: 0 },
  maximum: { type: Number, required: true, min: 0 },
}, { timestamps: true });
schema.index({ studentId: 1, createdAt: -1 });
schema.index({ examId: 1 });
module.exports = mongoose.model('Result', schema);
