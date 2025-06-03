// routes/tickets.js
const express = require("express");
const router = express.Router();
const Ticket = require("../models/Ticket"); // Adjust path if needed

// GET /api/tickets/:tokenId
router.get("/tickets/:tokenId", async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    const ticket = await Ticket.findOne({ tokenId });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({
      tokenId: ticket.tokenId,
      owner: ticket.attendee,
      eventDate: new Date(ticket.expiration * 1000),
      used: false // Or true if you add that logic elsewhere
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
