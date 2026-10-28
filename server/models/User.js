const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
      match: /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/,
    },

    role: {
      type: String,
      enum: ["Student", "Instructor", "Admin"],
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
