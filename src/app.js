const express = require('express');
require('./config/env'); // load env vars
require('./config/db'); // connect to MongoDB

const telegramRoutes = require('./routes/telegram.routes');
const otpRoutes = require('./routes/otp.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

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

// Global error handler
app.use((err, req, res, next) => {
    console.error('[FATAL ERROR] Background/Request Task Failed:', err);
    res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: err.message
    });
});

module.exports = app;
