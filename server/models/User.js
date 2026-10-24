const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  loginIdentifier: { type: String, required: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["Student", "Instructor", "Admin"], required: true },
  isActive: { type: Boolean, default: true, required: true },
}, { timestamps: true });

userSchema.index({ loginIdentifier: 1 }, { unique: true });
module.exports = mongoose.models.User || mongoose.model("User", userSchema);
