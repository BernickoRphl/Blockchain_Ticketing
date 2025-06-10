const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

// POST /api/tickets
router.post('/', async (req, res) => {
  try {
    const ticket = new Ticket(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all tickets
router.get('/', async (req, res) => {
  const tickets = await Ticket.find().sort({ createdAt: -1 });
  res.json(tickets);
});

// GET ticket by tokenId
router.get('/:tokenId', async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ tokenId: req.params.tokenId });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH ticket by tokenId
router.patch('/:tokenId', async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { tokenId: req.params.tokenId },
      { $set: req.body },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;