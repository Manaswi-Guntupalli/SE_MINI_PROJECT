const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");

const examRoutes = require("./routes/examRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

const sessionConfig = {
  name: "oep.sid",

  secret:
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === "test"
      ? "test-only-session-secret"
      : undefined),

  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 2,
  },
};

if (process.env.NODE_ENV !== "test") {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
  });
}

app.use(session(sessionConfig));

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Online Exam Portal API is running",
  });
});

module.exports = app;