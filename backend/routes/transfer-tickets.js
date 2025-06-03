const express = require("express");
const router = express.Router();
const Ticket = require("../models/Ticket"); // Adjust path if needed

// POST /api/transfer-ticket
router.post("/transfer-ticket", async (req, res) => {
  const { tokenId, toAddress } = req.body;

  if (!tokenId || !toAddress) {
    return res.status(400).json({ error: "tokenId and toAddress are required" });
  }

  try {
    const ticket = await Ticket.findOne({ tokenId: parseInt(tokenId) });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    ticket.attendee = toAddress;
    await ticket.save();

    res.json({ message: "Ticket ownership updated in the database." });
  } catch (err) {
    console.error("Error transferring ticket:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;