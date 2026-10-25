const mongoose = require("mongoose");
require("dotenv").config();
if (!process.env.MONGO_URI || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET === 'replace_with_a_long_random_secret') {
  console.error('Set MONGO_URI and a random SESSION_SECRET of at least 32 characters. See server/.env.example.');
  process.exit(1);
}
const app = require("./app");

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    await Promise.all(['User', 'Exam', 'Attempt', 'Result'].map(name => require(`./models/${name}`).init()));
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database startup failed. Check MongoDB connectivity and configuration.");
    process.exitCode = 1;
  });
