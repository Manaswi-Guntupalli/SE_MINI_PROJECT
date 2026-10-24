const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "Attempt", required: true, immutable: true },
  score: { type: Number, required: true, min: 0, validate: Number.isInteger },
  maximumScore: { type: Number, required: true, min: 0, validate: Number.isInteger },
  status: { type: String, enum: ["Evaluated"], default: "Evaluated", required: true },
}, { timestamps: true });

resultSchema.index({ attemptId: 1 }, { unique: true });
resultSchema.pre("validate", function validateScore() {
  if (this.score != null && this.maximumScore != null && this.score > this.maximumScore) {
    this.invalidate("score", "Score cannot exceed maximumScore");
  }
});
module.exports = mongoose.models.Result || mongoose.model("Result", resultSchema);
