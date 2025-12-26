const crypto = require('crypto');
const { hashOtp } = require('../utils/crypto');
const Otp = require('../models/Otp');
const TelegramUser = require('../models/TelegramUser');
const { bot } = require('./telegram.service');

/**
 * Custom Error for cases where the Telegram bot is blocked by the user.
 */
class BotBlockedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BotBlockedError';
        this.code = 'BOT_BLOCKED';
    }
}

// In‑memory rate‑limit map (per user) cleared every minute
const rateMap = new Map();
const RATE_LIMIT = 5; // requests per minute

function canRequestOtp(userId) {
    const now = Date.now();
    const record = rateMap.get(userId) || { count: 0, reset: now + 60_000 };
    if (now > record.reset) {
        record.count = 0;
        record.reset = now + 60_000;
    }
    if (record.count >= RATE_LIMIT) {
        return false;
    }
    record.count += 1;
    rateMap.set(userId, record);
    return true;
}

/**
 * Generate a 6‑digit OTP, store its hash, and send via Telegram.
 * @param {string} userId - Application user identifier.
 * @throws {BotBlockedError} Will throw if bot is blocked.
 * @throws {Error} Will throw if rate limit exceeded or Telegram not linked.
 */

async function generateAndSendOtp(userId) {
    if (!canRequestOtp(userId)) {
        throw new Error('Rate limit exceeded');
    }
    const user = await TelegramUser.findOne({ userId });
    if (!user) {
        throw new Error('Telegram account not linked');
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashed = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    console.log(`[DEBUG] Generated OTP for userId: ${userId} -> ${otp} (hashed: ${hashed})`);

    await Otp.findOneAndUpdate(
        { userId },
        { hashedOtp: hashed, expiresAt },
        { upsert: true, new: true }
    );

    try {
        console.log(`[DEBUG] Sending OTP to telegramUserId: ${user.telegramUserId}`);
        await bot.sendMessage(user.telegramUserId, `Your verification code is: ${otp}`);
    } catch (err) {

        // Handle 403 Forbidden (Blocked by user)
        if (err.response && (err.response.statusCode === 403 || (err.response.body && err.response.body.error_code === 403))) {
            throw new BotBlockedError('Telegram bot blocked');
        }
        throw err;
    }

    return true;
}

/**
 * Verify a submitted OTP.
 * @param {string} userId - Application user identifier.
 * @param {string} otp - OTP supplied by the client.
 * @returns {boolean} true if valid, false otherwise.
 */
async function verifyOtp(userId, otp) {
    const record = await Otp.findOne({ userId });
    if (!record) return false;
    if (record.expiresAt < new Date()) {
        await Otp.deleteOne({ _id: record._id });
        return false;
    }
    const hashed = hashOtp(otp);
    const isValid = hashed === record.hashedOtp;
    if (isValid) {
        await Otp.deleteOne({ _id: record._id }); // single‑use
    }
    return isValid;
}

/**
 * Unlinks the Telegram account for a given user.
 * @param {string} userId - The unique identifier for the user.
 * @returns {Promise<boolean>} - True if unlinked, false if wasn't linked.
 */
async function unlinkTelegram(userId) {
    const result = await TelegramUser.deleteOne({ userId });
    return result.deletedCount > 0;
}

/**
 * Checks if a user has a linked Telegram account.
 * @param {string} userId - The application user ID.
 * @returns {Promise<boolean>} - True if linked, false otherwise.
 */
async function isUserLinked(userId) {
    const user = await TelegramUser.findOne({ userId });
    return !!user;
}

module.exports = { generateAndSendOtp, verifyOtp, unlinkTelegram, BotBlockedError, isUserLinked };
