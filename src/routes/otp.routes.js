const express = require('express');
const router = express.Router();
const otpService = require('../services/otp.service');

// 1️⃣ Generate deep‑link token for Telegram start
router.post('/link-token', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const token = require('crypto').randomBytes(16).toString('hex');
    const TelegramLink = require('../models/TelegramLink');
    await TelegramLink.create({ token, userId });
    const deepLink = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${token}`;
    res.json({ deepLink });
});

// 2️⃣ Request OTP after Telegram linked
router.post('/request-otp', async (req, res) => {
    const { userId } = req.body;
    try {
        await otpService.generateAndSendOtp(userId);
        res.json({ message: 'OTP sent via Telegram' });
    } catch (e) {
        // If bot is blocked, generate a new deep link for the user to repair the connection
        if (e.message.includes('Telegram bot blocked')) {
            const token = require('crypto').randomBytes(16).toString('hex');
            const TelegramLink = require('../models/TelegramLink');
            await TelegramLink.create({ token, userId });
            const deepLink = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${token}`;

            return res.status(403).json({
                error: 'Telegram bot blocked. Please tap the link to restore the connection.',
                repairLink: deepLink
            });
        }
        res.status(400).json({ error: e.message });
    }
});

// 3️⃣ Verify OTP submitted by// Verify OTP
router.post('/verify', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        if (!userId || !otp) {
            return res.status(400).json({ error: 'userId and otp are required' });
        }
        const isValid = await otpService.verifyOtp(userId, otp);
        if (isValid) {
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Invalid or expired OTP' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unlink Telegram Account
router.post('/unlink', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const unlinked = await otpService.unlinkTelegram(userId);
        if (unlinked) {
            res.json({ success: true, message: 'Telegram account unlinked successfully' });
        } else {
            res.status(404).json({ error: 'No linked Telegram account found for this user' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
