const http = require('http');
const app = require('./app');
const { port } = require('./config/env');
const { bot } = require('./services/telegram.service');

const server = http.createServer(app);

server.listen(port, async () => {
    console.log(`Server listening on port ${port}`);
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL; // e.g., https://yourdomain.com/telegram/webhook
    if (webhookUrl) {
        try {
            await bot.setWebHook(webhookUrl);
            console.log('Telegram webhook set to', webhookUrl);
        } catch (err) {
            console.error('Failed to set Telegram webhook:', err);
        }
    } else {
        console.warn('TELEGRAM_WEBHOOK_URL not set – webhook not configured');
    }
});
