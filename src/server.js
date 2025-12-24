const http = require('http');
const app = require('./app');
const { port, telegramWebhookUrl } = require('./config/env');
const { bot } = require('./services/telegram.service');

const server = http.createServer(app);

server.listen(port, async () => {
    console.log(`Server listening on port ${port}`);
    console.log('DEBUG: Configured Webhook URL:', telegramWebhookUrl ? telegramWebhookUrl : '[NOT SET]');

    if (telegramWebhookUrl) {
        try {
            console.log('Attempting to set Telegram webhook...');
            await bot.setWebHook(telegramWebhookUrl);
            console.log('✅ Telegram webhook set successfully to:', telegramWebhookUrl);
        } catch (err) {
            console.error('❌ Failed to set Telegram webhook:', err.message);
            console.error('❌ Telegram webhook setup failed. Bot might not receive updates.');
        }
    } else {
        console.warn('⚠️ TELEGRAM_WEBHOOK_URL not set – falling back to POLLING mode');
    }
});
