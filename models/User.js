const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  wallet: { type: String, required: true, unique: true },
  email: { type: String },
  name: { type: String },
  isValidator: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
