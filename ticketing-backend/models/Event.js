const mongoose = require('mongoose');

const eventSchema = new  mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  datetime: { type: Date, required: true },
  organizer: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);