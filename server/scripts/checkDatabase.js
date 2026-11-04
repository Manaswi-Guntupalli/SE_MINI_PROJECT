const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in server/.env. See .env.example.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') throw new Error('Transactions require a replica set or Atlas; standalone MongoDB is unsupported.');
  for (const name of ['User', 'Exam', 'Attempt', 'Response', 'Result']) {
    const model = require(`../models/${name}`);
    await model.init();
    console.log(`${name}: initialized; indexes: ${(await model.collection.indexes()).map(index => index.name).join(', ')}`);
  }
  console.log('Database connectivity, transaction-capable topology and model initialization verified.');
})().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
