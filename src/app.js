const express = require('express');
require('./config/env'); // load env vars
require('./config/db'); // connect to MongoDB

const telegramRoutes = require('./routes/telegram.routes');
const otpRoutes = require('./routes/otp.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
app.use(express.json());

// Mount routes
app.use('/telegram', telegramRoutes);
app.use('/otp', otpRoutes);
app.use('/admin', adminRoutes);

// Health check and diagnostic route
app.get('/health', (req, res) => {
    const { telegramWebhookUrl, telegramBotUsername } = require('./config/env');
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        config: {
            botUsername: telegramBotUsername,
            webhookSet: !!telegramWebhookUrl,
            webhookUrl: telegramWebhookUrl || 'NOT_SET'
        }
    });
});

module.exports = app;
