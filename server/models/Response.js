const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "Attempt", required: true, immutable: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  revision: { type: Number, default: 0, min: 0 },
  selectedOptionId: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

responseSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

// Cross-document question/option membership and active/deadline checks cannot
// be guaranteed by a schema alone. All writes must use the guarded service.
module.exports = mongoose.models.Response || mongoose.model("Response", responseSchema);
