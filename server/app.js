const express = require("express");
const cors = require("cors");
const examRoutes = require("./routes/examRoutes");

// Import the same application in integration tests without opening a port or
// connecting to a developer's database. server.js owns process startup.
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/exams", examRoutes);
app.get("/", (req, res) => {
  res.json({ message: "Online Exam Portal API is running" });
});

module.exports = app;
