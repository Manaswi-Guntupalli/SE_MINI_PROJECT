const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../models/User');

(async () => {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password, ADMIN_NAME: name = 'Administrator' } = process.env;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || password.length > 72) {
    throw new Error('Provide ADMIN_EMAIL and ADMIN_PASSWORD (12–72 characters) in the process environment.');
  }
  await mongoose.connect(process.env.MONGO_URI);
  if (await User.exists({ role: 'Admin' })) throw new Error('An Admin already exists; use authenticated account management.');
  await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'Admin', active: true });
  console.log('Initial Admin created.');
})().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
