const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const examRoutes = require("./routes/examRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/exams", examRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Online Exam Portal API is running" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });