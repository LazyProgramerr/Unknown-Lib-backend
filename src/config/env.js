require('dotenv').config();
module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME,
  otpRateLimit: 5, // max requests per minute per user
};
