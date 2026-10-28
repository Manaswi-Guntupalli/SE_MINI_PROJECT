const mongoose = require("mongoose");
require("dotenv").config();
if (!process.env.MONGO_URI || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET === 'replace_with_a_long_random_secret') {
  console.error('Set MONGO_URI and a random SESSION_SECRET of at least 32 characters. See server/.env.example.');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const topology = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!topology.setName && topology.msg !== 'isdbgrid') throw Object.assign(new Error('Replica set required'), { code: 'OEP_REPLICA_REQUIRED' });
    await Promise.all(['User', 'Exam', 'Attempt', 'Response', 'Result'].map(name => require(`./models/${name}`).init()));
    const app = require('./app');
    const stopExpiryWorker = require('./services/submissionService').startExpiryWorker();
    process.once('SIGTERM', stopExpiryWorker);
    process.once('SIGINT', stopExpiryWorker);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(async (error) => {
    console.error(error.code === 'OEP_REPLICA_REQUIRED'
      ? 'MongoDB replica set required. Run npm run db:dev or use Atlas; see docs/DATABASE_SETUP.md.'
      : 'Database startup failed. Check MongoDB connectivity and configuration.');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
