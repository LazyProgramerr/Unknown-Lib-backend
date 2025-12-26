const http = require('http');
const app = require('./app');
const { port, telegramWebhookUrl } = require('./config/env');
const { bot } = require('./services/telegram.service');

const server = http.createServer(app);

server.listen(port, async () => {
    console.log(`[INIT] Server listening on port ${port}`);
    console.log(`[INIT] Mode: ${telegramWebhookUrl ? 'WEBHOOK' : 'POLLING'}`);

    if (telegramWebhookUrl) {
        try {
            console.log(`[INIT] Setting webhook to: ${telegramWebhookUrl}`);
            await bot.setWebHook(telegramWebhookUrl);
            console.log('✅ [INIT] Telegram webhook set successfully');
        } catch (err) {
            console.error('❌ [INIT] Failed to set Telegram webhook:', err.message);
            console.error('❌ [INIT] Bot might not receive updates via Webhook.');
        }
    } else {
        console.warn('⚠️ [INIT] TELEGRAM_WEBHOOK_URL not set – falling back to POLLING mode');
    }
});
