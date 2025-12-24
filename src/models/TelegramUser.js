const { Schema, model } = require('mongoose');

const telegramUserSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    telegramUserId: { type: String, required: true, unique: true },
    chatId: { type: String, required: true },
});

module.exports = model('TelegramUser', telegramUserSchema);
