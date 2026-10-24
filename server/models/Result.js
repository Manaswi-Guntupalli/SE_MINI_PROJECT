const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "Attempt", required: true, immutable: true },
  score: { type: Number, required: true, min: 0, validate: { validator(value) { return Number.isInteger(value) && (this.maximumScore == null || value <= this.maximumScore); }, message: "Score must be an integer between zero and maximumScore" } },
  maximumScore: { type: Number, required: true, min: 0, validate: Number.isInteger },
  status: { type: String, enum: ["Evaluated"], default: "Evaluated", required: true },
}, { timestamps: true });

resultSchema.index({ attemptId: 1 }, { unique: true });
module.exports = mongoose.models.Result || mongoose.model("Result", resultSchema);
