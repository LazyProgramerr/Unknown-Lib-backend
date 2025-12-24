const { Schema, model } = require('mongoose');

const telegramLinkSchema = new Schema({
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 } // 5 min TTL
});


module.exports = model('TelegramLink', telegramLinkSchema);
