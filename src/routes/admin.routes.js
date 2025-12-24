const express = require('express');
const router = express.Router();
const TelegramUser = require('../models/TelegramUser');
const { adminAccessCode } = require('../config/env');

// Simple Admin Dashboard to view users
router.get('/dashboard', async (req, res) => {
    // Disable dashboard if no code is configured in environment
    if (!adminAccessCode) {
        return res.status(503).send('<h1>Service Unavailable</h1><p>Admin dashboard is not configured.</p>');
    }

    const { code } = req.query;
    if (code !== adminAccessCode) {
        return res.status(403).send('<h1>Forbidden</h1><p>Invalid access code.</p>');
    }

    try {
        const users = await TelegramUser.find({});
        const tokens = await require('../models/TelegramLink').find({});
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Admin Dashboard</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f0f2f5; color: #1c1e21; }
                    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    h1 { color: #1a73e8; margin-bottom: 30px; font-weight: 500; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; border-radius: 8px; overflow: hidden; }
                    th, td { padding: 15px; border-bottom: 1px solid #e0e0e0; text-align: left; }
                    th { background: #1a73e8; color: white; font-weight: 600; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; }
                    tr:hover { background: #f8f9fa; }
                    .chat-id { font-family: monospace; color: #5f6368; }
                    .no-users { padding: 40px; text-align: center; color: #70757a; font-size: 18px; }
                    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #e8f0fe; color: #1967d2; font-size: 12px; font-weight: 500; }
                    .debug-header { margin-top: 50px; padding-top: 20px; border-top: 1px dashed #ccc; color: #d93025; }
                </style>

                <script>
                    // Anti-Tamper Protection
                    document.addEventListener('contextmenu', event => event.preventDefault()); // Disable Right Click
                    
                    document.onkeydown = function(e) {
                        // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
                        if (e.keyCode == 123 || 
                            (e.ctrlKey && e.shiftKey && (e.keyCode == 'I'.charCodeAt(0) || e.keyCode == 'J'.charCodeAt(0) || e.keyCode == 'C'.charCodeAt(0))) || 
                            (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0))) {
                            return false;
                        }
                    };

                    // Detect DevTools by checking for 'debugger' execution speed
                    setInterval(function() {
                        const startTime = performance.now();
                        debugger;
                        const duration = performance.now() - startTime;
                        if (duration > 100) {
                            document.body.innerHTML = '<h1>Security Check</h1><p>Developer tools are not allowed on this dashboard.</p>';
                        }
                    }, 1000);
                </script>
            </head>
            <body>
                <div class="container">
                    <h1>Linked Telegram Users</h1>
                    ${users.length === 0 ? '<div class="no-users">No users linked yet.</div>' : `
                    <table>
                        <thead>
                            <tr>
                                <th>App User ID</th>
                                <th>Telegram User ID</th>
                                <th>Telegram Chat ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr>
                                    <td><strong>${u.userId}</strong></td>
                                    <td><span class="badge">${u.telegramUserId}</span></td>
                                    <td class="chat-id">${u.chatId}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    `}

                    <div class="debug-header">
                        <h2>Debug: Active Linking Tokens</h2>
                        <p>Tokens currently in database (Expires in 5 mins)</p>
                    </div>
                    ${tokens.length === 0 ? '<div class="no-users">No active tokens found.</div>' : `
                    <table>
                        <thead>
                            <tr>
                                <th>Token (Hex)</th>
                                <th>User ID</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tokens.map(t => `
                                <tr>
                                    <td><code>${t.token}</code></td>
                                    <td>${t.userId}</td>
                                    <td>${t.createdAt || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    `}
                </div>
            </body>

            </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send('Error fetching users from database.');
    }
});

module.exports = router;
