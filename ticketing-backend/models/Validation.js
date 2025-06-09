const mongoose = require('mongoose');

const validationSchema = new mongoose.Schema({
  tokenId: { type: Number, required: true },
  validator: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Validation', validationSchema);