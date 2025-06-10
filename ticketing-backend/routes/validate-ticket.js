const express = require('express');
const router = express.Router();
const Validation = require('../models/Validation');
const Transaction = require('../models/Transaction');

// POST /api/validate-ticket
router.post('/', async (req, res) => {
    try {
        const { tokenId, validator, txHash } = req.body;
        
        // Create validation record
        const validation = new Validation({
            tokenId,
            validator,
            timestamp: new Date()
        });
        await validation.save();

        // Create transaction record
        const transaction = new Transaction({
            tokenId,
            from: validator,
            to: validator, // Same address for validation
            priceETH: "0", // No price for validation
            txHash,
            type: 'validate'
        });
        await transaction.save();

        res.status(201).json(validation);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
