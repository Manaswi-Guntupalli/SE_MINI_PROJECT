const mongoose = require('mongoose');
require('dotenv').config();
const { repairWeightedResults } = require('../services/repairWeightedResults');

(async () => {
  if (process.argv.slice(2).some(argument => argument !== '--apply')) throw new Error('Usage: npm run results:repair-marks -- [--apply]');
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in server/.env.');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  const apply = process.argv.includes('--apply');
  console.log(apply ? 'Applying weighted result corrections' : 'Dry run: no results will be changed');
  const summary = await repairWeightedResults({ apply, onChange: change => console.log(JSON.stringify(change)) });
  console.log(JSON.stringify(summary));
})().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
