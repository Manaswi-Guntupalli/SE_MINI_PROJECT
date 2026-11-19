const mongoose = require('mongoose');
const User = require('../models/User');
const AdminAccessLock = require('../models/AdminAccessLock');

const failure = (message, status) => Object.assign(new Error(message), { status });

async function updateAccountAccess({ actorId, userId, changes }) {
  // Create the shared lock outside the transaction, before taking its write lock.
  try {
    await AdminAccessLock.updateOne({ _id: 'admin-access' }, { $setOnInsert: { revision: 0 } }, { upsert: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      await AdminAccessLock.updateOne({ _id: 'admin-access' }, { $inc: { revision: 1 } }, { session });
      // Authorization must be rechecked after serialization, not only in middleware.
      if (!await User.exists({ _id: actorId, active: true, role: 'Admin' }).session(session)) {
        throw failure('Administrator access changed. Sign in again.', 403);
      }
      if (String(actorId) === String(userId) && (changes.active === false || (changes.role && changes.role !== 'Admin'))) {
        throw failure('Use another Admin to change your own access', 400);
      }
      const user = await User.findByIdAndUpdate(userId, { $set: changes }, { new: true, runValidators: true, session });
      if (!user) throw failure('Account not found', 404);
      if (await User.countDocuments({ active: true, role: 'Admin' }).session(session) < 1) {
        throw failure('At least one active administrator must remain', 409);
      }
      return user;
    });
  } finally { await session.endSession(); }
}

module.exports = { updateAccountAccess };
