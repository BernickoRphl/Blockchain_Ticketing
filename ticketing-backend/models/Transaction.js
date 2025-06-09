const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  tokenId: { type: Number, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  priceETH: { type: String, required: true },
  txHash: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['mint', 'transfer', 'validate', 'revoke'], required: true }
});

module.exports = mongoose.model('Transaction', transactionSchema);