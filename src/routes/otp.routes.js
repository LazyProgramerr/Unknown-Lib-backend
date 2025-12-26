const express = require('express');
const router = express.Router();
const otpService = require('../services/otp.service');

const { telegramBotUsername } = require('../config/env');

// 1️⃣ Generate deep‑link token for Telegram start
router.post('/link-token', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const TelegramLink = require('../models/TelegramLink');

    // Reuse existing active link if available
    const existingLink = await TelegramLink.findOne({ userId });
    if (existingLink) {
        const deepLink = `https://t.me/${telegramBotUsername}?start=${existingLink.token}`;
        console.log(`Reusing existing link token for userId: ${userId}`);
        return res.json({
            success: true,
            message: 'Active link token reused',
            deepLink
        });
    }

    const token = require('crypto').randomBytes(16).toString('hex');
    await TelegramLink.create({ token, userId });
    const deepLink = `https://t.me/${telegramBotUsername}?start=${token}`;
    console.log(`New link token generated for userId: ${userId}`);
    res.json({
        success: true,
        message: 'Link token generated',
        deepLink
    });
});

// 2️⃣ Request OTP after Telegram linked
router.post('/request-otp', async (req, res) => {
    const { userId } = req.body;
    try {
        await otpService.generateAndSendOtp(userId);
        res.json({ success: true, message: 'OTP sent via Telegram' });
    } catch (e) {
        // If bot is blocked, generate a new deep link for the user to repair the connection
        if (e.name === 'BotBlockedError') {
            const token = require('crypto').randomBytes(16).toString('hex');
            const TelegramLink = require('../models/TelegramLink');
            await TelegramLink.create({ token, userId });
            const deepLink = `https://t.me/${telegramBotUsername}?start=${token}`;

            return res.status(403).json({
                success: false,
                error: 'BOT_BLOCKED',
                message: 'Telegram bot blocked. Please start the bot again to restore delivery.',
                repairLink: deepLink
            });
        }
        res.status(400).json({ success: false, error: e.message });
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
