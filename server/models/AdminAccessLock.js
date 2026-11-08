const mongoose = require('mongoose');

// Every role/status change locks the same document across all server processes.
module.exports = mongoose.model('AdminAccessLock', new mongoose.Schema({
  _id: { type: String },
  revision: { type: Number, default: 0 },
}));
