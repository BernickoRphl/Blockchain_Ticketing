const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// POST /api/transactions
router.post('/', async (req, res) => {
    try {
        const { tokenId, from, to, priceETH, txHash, type } = req.body;
        
        const transaction = new Transaction({
            tokenId,
            from,
            to,
            priceETH,
            txHash,
            type,
            timestamp: new Date()
        });
        await transaction.save();

        res.status(201).json(transaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/transactions
router.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ timestamp: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/transactions/:txHash
router.get('/:txHash', async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ txHash: req.params.txHash });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
