
"use strict";

const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
      ref: "Attempt",
    },

    examId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Exam",
    },

    score: {
      type: Number,
      required: true,
      min: 0,
    },

    maximumScore: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Evaluated"],
      default: "Evaluated",
      required: true,
    },

    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Validate the score before saving a result.
resultSchema.path("score").validate(
  function (value) {
    return (
      Number.isInteger(value) &&
      Number.isInteger(this.maximumScore) &&
      value <= this.maximumScore
    );
  },
  "Score must be a whole number and cannot exceed maximum score"
);

// Export the Result model.
module.exports = mongoose.model("Result", resultSchema);
