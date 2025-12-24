const express = require('express');
const router = express.Router();
const { handleStart } = require('../services/telegram.service');

// Telegram will POST updates to this endpoint
router.post('/webhook', express.json(), async (req, res) => {
    const update = req.body;
    if (update.message && update.message.text && update.message.text.startsWith('/start')) {
        await handleStart(update.message);
    }
    // Respond quickly to Telegram
    res.sendStatus(200);
});

module.exports = router;
