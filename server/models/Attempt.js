const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true, immutable: true },
  startedAt: { type: Date, required: true, immutable: true },
  deadlineAt: { type: Date, required: true, immutable: true, validate: { validator(value) { return !value || !this.startedAt || value > this.startedAt; }, message: "Deadline must be later than start time" } },
  status: { type: String, enum: ["Active", "Submitted"], default: "Active", required: true, validate: { validator(value) { return value !== "Active" || (!this.submittedAt && !this.submissionReason); }, message: "Active attempts cannot have submission metadata" } },
  submittedAt: { type: Date, default: null, validate: { validator(value) { return this.status !== "Submitted" || (!!value && !!this.submissionReason); }, message: "Submitted attempts require submission timestamp and reason" } },
  submissionReason: { type: String, enum: ["Manual", "Timeout", null], default: null },
  evaluationStatus: { type: String, enum: ["Pending", "Evaluated"], default: "Pending", required: true },
}, { timestamps: true });

attemptSchema.index({ studentId: 1, examId: 1 }, { unique: true });
module.exports = mongoose.models.Attempt || mongoose.model("Attempt", attemptSchema);
