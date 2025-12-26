const TelegramBot = require('node-telegram-bot-api');
const { telegramBotToken, telegramWebhookUrl } = require('../config/env');
const TelegramUser = require('../models/TelegramUser');
const TelegramLink = require('../models/TelegramLink');

// Initialize bot: Use polling if no webhook URL is set (for local dev)
const isPolling = !telegramWebhookUrl;
const bot = new TelegramBot(telegramBotToken, { polling: isPolling });

console.log(`[INIT] Bot initialized in ${isPolling ? 'POLLING' : 'WEBHOOK'} mode.`);

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
    const telegramUserId = msg.from.id.toString();
    // Use regex to extract token robustly (handles multiple spaces or bot username)
    const tokenMatch = msg.text.match(/^\/start(?:@\w+)?\s+(.+)$/);
    const token = tokenMatch ? tokenMatch[1].trim() : null;


    console.log(`Processing link request for user (chatId: ${chatId})`);

    if (!token) {
        return bot.sendMessage(chatId, '❌ Please use the unique link provided by your application to start.');
    }

    // Find the linking token
    const link = await TelegramLink.findOne({ token });

    if (!link) {
        const allActive = await TelegramLink.find({}, 'token');
        const envLabel = process.env.TELEGRAM_WEBHOOK_URL ? 'PRODUCTION' : 'LOCAL';
        console.error(`[${envLabel}] Link token "${token}" not found. Current tokens in DB: [${allActive.map(t => t.token).join(', ')}]`);
        return bot.sendMessage(chatId, `❌ This registration link is invalid or has expired.\n\nServer: ${envLabel}\n\nPlease generate a new link from your application. Note that links expire after 20 minutes for your security.`);
    }




    // 1. Check if App User is already linked
    const existingAppUserLink = await TelegramUser.findOne({ userId: link.userId });
    if (existingAppUserLink) {
        // Cleanup token regardless of conflict to prevent stale data
        await TelegramLink.deleteOne({ _id: link._id });

        if (existingAppUserLink.telegramUserId === telegramUserId) {
            console.log(`Repair success: App User ${link.userId} unblocked the bot.`);
            return bot.sendMessage(chatId, '✅ Connection restored!\n\nYour account is already linked and the connection is now active. You will continue to receive OTP verification codes here.');
        } else {
            console.log(`Registration conflict: App User ${link.userId} is already linked to another Telegram ID.`);
            return bot.sendMessage(chatId, 'ℹ️ This application account is already linked to a different Telegram user.');
        }
    }

    // 2. Check if this Telegram ID is already linked to SOMEONE ELSE
    const existingTelegramUserLink = await TelegramUser.findOne({ telegramUserId });
    if (existingTelegramUserLink) {
        // Cleanup token regardless of conflict to prevent stale data
        await TelegramLink.deleteOne({ _id: link._id });

        console.log(`Registration conflict: Telegram ID ${telegramUserId} is already linked.`);
        return bot.sendMessage(chatId, '⚠️ This Telegram account is already linked to a different application user.');
    }


    // Create new strict mapping
    try {
        await TelegramUser.create({
            userId: link.userId,
            telegramUserId,
            chatId
        });

        // Delete the link token – one‑time use
        await TelegramLink.deleteOne({ _id: link._id });

        await bot.sendMessage(chatId, '✅ Success! You are now registered and secured.\n\nYou will receive OTP verification codes here.');
    } catch (err) {
        console.error('Database error during Telegram linking:', err);
        // Clean error message for user, no stack trace
        await bot.sendMessage(chatId, '❌ Registration failed.\n\nA technical issue occurred on our end. Please try again in a few minutes.');
    }
}



module.exports = { bot, handleStart };
