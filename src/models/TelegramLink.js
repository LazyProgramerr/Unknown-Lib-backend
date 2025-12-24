const { Schema, model } = require('mongoose');

const telegramLinkSchema = new Schema({
    token: { type: String, required: true, unique: true, index: true, expires: 300 }, // 5 min TTL
    userId: { type: String, required: true },
});

module.exports = model('TelegramLink', telegramLinkSchema);
