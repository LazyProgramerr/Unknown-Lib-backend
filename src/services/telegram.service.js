const TelegramBot = require('node-telegram-bot-api');
const { telegramBotToken, telegramWebhookUrl } = require('../config/env');
const TelegramUser = require('../models/TelegramUser');
const TelegramLink = require('../models/TelegramLink');

/* ------------------ BOT INIT ------------------ */

if (!telegramBotToken) {
    console.error('❌ [FATAL] TELEGRAM_BOT_TOKEN is missing');
}

const isPolling = !telegramWebhookUrl;

const bot = new TelegramBot(telegramBotToken, {
    polling: isPolling
});

console.log(`[INIT] Telegram Bot started in ${isPolling ? 'POLLING' : 'WEBHOOK'} mode`);

/* ------------------ WEBHOOK SETUP ------------------ */
/**
 * IMPORTANT:
 * You MUST call this from your Express app:
 *
 * app.post('/telegram/webhook', (req, res) => {
 *   bot.processUpdate(req.body);
 *   res.sendStatus(200);
 * });
 */
if (!isPolling) {
    bot.setWebHook(`${telegramWebhookUrl}/telegram/webhook`);
    console.log(`[INIT] Webhook set to ${telegramWebhookUrl}/telegram/webhook`);
}

/* ------------------ START HANDLER (GLOBAL) ------------------ */
/**
 * THIS IS THE FIX 🔥
 * Works for BOTH polling and webhook
 */
bot.onText(/\/start(?:@\w+)?(?:\s+(.+))?/, async (msg) => {
    await handleStart(msg);
});

/* ------------------ CORE LOGIC ------------------ */

async function handleStart(msg) {
    const chatId = msg.chat.id.toString();
    const telegramUserId = msg.from.id.toString();

    const match = msg.text.match(/^\/start(?:@\w+)?\s*(.*)?$/);
    const token = match && match[1] ? match[1].trim() : null;

    console.log('[START]');
    console.log('Chat ID:', chatId);
    console.log('Telegram User ID:', telegramUserId);
    console.log('Token:', token);

    if (!token) {
        return bot.sendMessage(
            chatId,
            '❌ Invalid or missing link.\n\nPlease generate a fresh Telegram link from the app.'
        );
    }

    /* ------------------ TOKEN LOOKUP ------------------ */
    const link = await TelegramLink.findOne({ token });

    if (!link) {
        console.warn('[START] Token not found or expired:', token);
        return bot.sendMessage(
            chatId,
            '❌ This link is invalid or expired.\n\nPlease generate a new one from the app.'
        );
    }

    /* ------------------ APP USER ALREADY LINKED ------------------ */
    const existingAppUser = await TelegramUser.findOne({ userId: link.userId });

    if (existingAppUser) {
        await TelegramLink.deleteOne({ _id: link._id });

        if (existingAppUser.telegramUserId === telegramUserId) {
            console.log('[RELINK] Same Telegram user reconnected');
            await bot.sendChatAction(chatId, 'typing');
            return bot.sendMessage(
                chatId,
                '✅ Your Telegram is already linked.\n\nYou will receive OTPs here.'
            );
        }

        console.warn('[CONFLICT] App user already linked to another Telegram');
        return bot.sendMessage(
            chatId,
            '⚠️ This app account is already linked to another Telegram user.'
        );
    }

    /* ------------------ TELEGRAM USER ALREADY LINKED ------------------ */
    const existingTelegramUser = await TelegramUser.findOne({ telegramUserId });

    if (existingTelegramUser) {
        await TelegramLink.deleteOne({ _id: link._id });

        console.warn('[CONFLICT] Telegram already linked to another app user');
        return bot.sendMessage(
            chatId,
            '⚠️ This Telegram account is already linked to another app user.'
        );
    }

    /* ------------------ CREATE LINK ------------------ */
    try {
        await TelegramUser.create({
            userId: link.userId,
            telegramUserId,
            chatId
        });

        await TelegramLink.deleteOne({ _id: link._id });

        await bot.sendChatAction(chatId, 'typing');
        await bot.sendMessage(
            chatId,
            '✅ Telegram linked successfully!\n\nYou will receive OTPs here.\n\n🔔 Please UNMUTE and PIN this chat.'
        );

        console.log('[SUCCESS] Telegram linked:', {
            userId: link.userId,
            telegramUserId
        });
    } catch (err) {
        console.error('[ERROR] Linking failed:', err);
        await bot.sendMessage(
            chatId,
            '❌ Something went wrong.\n\nPlease try again in a few minutes.'
        );
    }
}

/* ------------------ EXPORT ------------------ */

module.exports = { bot };
