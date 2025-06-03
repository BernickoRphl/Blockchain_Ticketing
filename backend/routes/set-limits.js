const express = require("express");
const router = express.Router();
const Limit = require("../models/Limit");

router.post("/set-limits", async (req, res) => {
  try {
    const { type, data } = req.body;
    const saved = await Limit.create({
      type,
      data,
      createdAt: new Date()
    });
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error saving limits to DB:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;