const express = require("express");
const router = express.Router();
const Ticket = require("../models/Ticket");

// POST /api/validate-ticket
router.post("/validate-ticket", async (req, res) => {
  const { tokenId } = req.body;

  if (!tokenId) {
    return res.status(400).json({ error: "tokenId is required." });
  }

  try {
    const ticket = await Ticket.findOne({ tokenId: parseInt(tokenId) });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const now = Math.floor(Date.now() / 1000);

    if (ticket.used) {
      return res.json({ status: "used", message: "Ticket already used." });
    } else if (ticket.expiration < now) {
      return res.json({ status: "expired", message: "Ticket expired." });
    } else {
      return res.json({ status: "valid", message: "Ticket is valid." });
    }

  } catch (err) {
    console.error("Validation error:", err);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;