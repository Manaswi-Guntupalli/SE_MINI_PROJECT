const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      default: "",
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [optionSchema],
      default: [],
    },

    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startTime: {
      type: Date,
      default: null,
    },

    duration: {
      type: Number,
      required: true,
      min: Number.MIN_VALUE,
      validate: Number.isFinite,
    },

    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },

    questions: {
      type: [questionSchema],
      default: [],
      validate: {
        validator(questions) {
          const identifiers = [];
          for (const question of questions) {
            identifiers.push(String(question._id), ...question.options.map(option => String(option._id)));
          }
          if (new Set(identifiers).size !== identifiers.length) return false;
          return this.status !== 'Published' || (questions.length > 0 && questions.every(question =>
            question.questionText?.trim() && question.options.length >= 2 &&
            question.options.every(option => option.text?.trim()) &&
            question.options.filter(option => option.isCorrect).length === 1));
        },
        message: 'Published exams require complete questions and exactly one correct option; embedded identifiers must be unique',
      },
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

examSchema.index({ instructorId: 1, createdAt: -1 });
examSchema.index({ status: 1, startTime: 1 });

examSchema.pre('save', async function () {
  if (this.isNew) return;
  const stored = await this.constructor.findById(this._id).select('status __v').session(this.$session());
  if (stored && stored.__v !== this.__v) throw new mongoose.Error.VersionError(this, this.__v, this.modifiedPaths());
  if (stored?.status === 'Published' && ['title', 'description', 'instructorId', 'startTime', 'duration', 'status', 'questions'].some(field => this.isModified(field))) {
    throw new Error('Published exam definitions are immutable');
  }
});

module.exports = mongoose.model("Exam", examSchema);
