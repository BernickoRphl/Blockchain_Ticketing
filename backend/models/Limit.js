const mongoose = require("mongoose");

const limitSchema = new mongoose.Schema({
  type: { type: String, enum: ["resale", "spending"], required: true },
  data: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Limit", limitSchema);