const mongoose = require('mongoose');
const { Schema } = mongoose;

const validationSchema = new Schema({
  tokenId: { type: Number, required: true },
  validator: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Validation', validationSchema);
