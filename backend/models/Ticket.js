const mongoose = require("mongoose");

const nftSchema = new mongoose.Schema({
  tokenId: Number,
  ipfsURI: String,
  attendee: String,
  txHash: String,
  expiration: Number,
}, { timestamps: true });

module.exports = mongoose.model("Ticket", nftSchema);