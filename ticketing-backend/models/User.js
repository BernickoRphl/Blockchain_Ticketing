const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  wallet: { type: String, required: true, unique: true },
  isValidator: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);