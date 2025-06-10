const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

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

ticketSchema.plugin(AutoIncrement, { inc_field: 'tokenId' });

module.exports = mongoose.model('Ticket', ticketSchema);
