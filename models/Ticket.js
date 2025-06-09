const mongoose = require('mongoose');
const { Schema } = mongoose;

const ticketSchema = new Schema({
  tokenId: { type: Number, required: true, unique: true },
  metadataURI: { type: String, required: true },
  owner: { type: String, required: true },
  resaleCapETH: { type: String, required: true },
  expiration: { type: Date, required: true },
  used: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'expired', 'used', 'revoked'], default: 'active' },
  eventId: { type: Schema.Types.UUID, ref: 'Event' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
