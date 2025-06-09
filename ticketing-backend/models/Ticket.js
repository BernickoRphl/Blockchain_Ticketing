const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  tokenId: Number,
  metadataURI: String,
  attendee: String,
  priceCap: String,
  expiration: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Ticket', ticketSchema);
