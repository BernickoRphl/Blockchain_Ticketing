const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/users
router.post('/', async (req, res) => {
    try {
        const { wallet } = req.body;
        
        // Check if wallet is valid
        if (!wallet || !wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ wallet });
        if (existingUser) {
            return res.status(200).json(existingUser);
        }

        // Create new user
        const user = new User({
            wallet,
            isValidator: false,
            createdAt: new Date()
        });
        await user.save();

        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/users/:wallet
router.get('/:wallet', async (req, res) => {
    try {
        const user = await User.findOne({ wallet: req.params.wallet });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/users/:wallet/validator
router.patch('/:wallet/validator', async (req, res) => {
    try {
        const { isValidator } = req.body;
        const user = await User.findOneAndUpdate(
            { wallet: req.params.wallet },
            { isValidator },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
