const TelegramBot = require('node-telegram-bot-api');
const { telegramBotToken } = require('../config/env');
const TelegramUser = require('../models/TelegramUser');
const TelegramLink = require('../models/TelegramLink');

// Initialize bot: Use polling if no webhook URL is set (for local dev)
const isPolling = !process.env.TELEGRAM_WEBHOOK_URL;
const bot = new TelegramBot(telegramBotToken, { polling: isPolling });

if (isPolling) {
    console.log('Bot started in POLLING mode (no webhook configured)');
    // In polling mode, we must listen for 'message' events to mimic webhook payload structure if needed,
    // but better to just use the same handleStart function on 'text' events.
    bot.on('text', (msg) => {
        if (msg.text && msg.text.startsWith('/start')) {
            handleStart(msg);
        }
    });
}

/**
 * Handles the /start <token> deep link from Telegram.
 * @param {Object} msg - Telegram message object.
 */
async function handleStart(msg) {
    const chatId = msg.chat.id.toString();
    const parts = msg.text.split(' ');
    const token = parts[1]; // token after /start
    if (!token) return; // ignore plain /start

    // Find the linking token
    const link = await TelegramLink.findOne({ token });
    if (!link) {
        // Invalid or expired token
        await bot.sendMessage(chatId, '❌ Invalid or expired link token.');
        return;
    }

    // Upsert mapping between userId and chatId
    await TelegramUser.findOneAndUpdate(
        { userId: link.userId },
        { chatId },
        { upsert: true, new: true }
    );

    // Delete the link token – one‑time use
    await TelegramLink.deleteOne({ _id: link._id });

    await bot.sendMessage(chatId, '✅ Telegram linked successfully. You can now request an OTP.');
}

module.exports = { bot, handleStart };
