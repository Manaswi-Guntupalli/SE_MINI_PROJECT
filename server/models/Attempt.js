const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true, immutable: true },
  startedAt: { type: Date, required: true, immutable: true },
  deadlineAt: { type: Date, required: true, immutable: true },
  status: { type: String, enum: ["Active", "Submitted"], default: "Active", required: true },
  submittedAt: { type: Date, default: null },
  submissionReason: { type: String, enum: ["Manual", "Timeout", null], default: null },
  evaluationStatus: { type: String, enum: ["Pending", "Evaluated"], default: "Pending", required: true },
}, { timestamps: true });

attemptSchema.index({ studentId: 1, examId: 1 }, { unique: true });
attemptSchema.pre("validate", function validateAttempt() {
  if (this.startedAt && this.deadlineAt && this.deadlineAt <= this.startedAt) {
    this.invalidate("deadlineAt", "Deadline must be later than start time");
  }
  if (this.status === "Active" && (this.submittedAt || this.submissionReason)) {
    this.invalidate("status", "Active attempts cannot have submission metadata");
  }
  if (this.status === "Submitted" && (!this.submittedAt || !this.submissionReason)) {
    this.invalidate("submittedAt", "Submitted attempts require submission timestamp and reason");
  }
});
module.exports = mongoose.models.Attempt || mongoose.model("Attempt", attemptSchema);
