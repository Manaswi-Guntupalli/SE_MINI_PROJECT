const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");

const examRoutes = require("./routes/examRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '256kb' }));
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('Origin') && req.get('Origin') !== clientOrigin) return res.status(403).json({ message: 'Origin not allowed' });
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ message: 'A JSON object is required' });
  }
  next();
});

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

if (
  process.env.NODE_ENV !== "test" &&
  process.env.MONGO_URI
) {
    sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
  });
}

app.use(session(sessionConfig));

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get("/", (req, res) => {
  res.json({
    message: "Online Exam Portal API is running",
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status === 413 ? 413 : 400).json({ message: error.status === 413 ? 'Request is too large' : 'Invalid request' });
});

module.exports = app;
