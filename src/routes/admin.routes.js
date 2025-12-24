const express = require('express');
const router = express.Router();
const TelegramUser = require('../models/TelegramUser');
const TelegramLink = require('../models/TelegramLink');
const { adminAccessCode } = require('../config/env');

/**
 * Middleware to check admin access code.
 */
const checkAdmin = (req, res, next) => {
    const code = req.query.code || req.body.code;
    if (!adminAccessCode) {
        return res.status(503).json({ error: 'Admin access not configured' });
    }
    if (code !== adminAccessCode) {
        return res.status(403).json({ error: 'Forbidden: Invalid access code' });
    }
    next();
};

// 1. Unlink User
router.post('/unlink-user', checkAdmin, async (req, res) => {
    const { userId } = req.body;
    try {
        const result = await TelegramUser.deleteOne({ userId });
        if (result.deletedCount > 0) {
            res.json({ success: true, message: `User ${userId} unlinked successfully` });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. Revoke Linking Token
router.post('/revoke-token', checkAdmin, async (req, res) => {
    const { token } = req.body;
    try {
        const result = await TelegramLink.deleteOne({ token });
        if (result.deletedCount > 0) {
            res.json({ success: true, message: 'Token revoked successfully' });
        } else {
            res.status(404).json({ error: 'Token not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. Admin Dashboard
router.get('/dashboard', async (req, res) => {
    if (!adminAccessCode) {
        return res.status(503).send('<h1>Service Unavailable</h1><p>Admin dashboard is not configured.</p>');
    }

    const { code } = req.query;
    if (code !== adminAccessCode) {
        return res.status(403).send('<h1>Forbidden</h1><p>Invalid access code.</p>');
    }

    try {
        const users = await TelegramUser.find({});
        const tokens = await TelegramLink.find({});

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Management Dashboard</title>
                <style>
                    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; }
                    .container { max-width: 1100px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                    h1 { color: #2563eb; margin-bottom: 30px; font-weight: 700; letter-spacing: -0.025em; }
                    h2 { font-size: 1.5rem; margin-top: 40px; color: #475569; }
                    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                    th, td { padding: 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                    th { background: #f1f5f9; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
                    tr:last-child td { border-bottom: none; }
                    tr:hover { background: #f8fafc; }
                    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #dbeafe; color: #1e40af; font-size: 13px; font-weight: 500; }
                    .btn { padding: 8px 16px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                    .btn-danger { background: #fee2e2; color: #991b1b; }
                    .btn-danger:hover { background: #fecaca; transform: translateY(-1px); }
                    .btn-danger:active { transform: translateY(0); }
                    .no-data { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; }
                    code { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-family: ui-monospace, monospace; font-size: 13px; }
                </style>
                <script>
                    async function performAction(endpoint, body) {
                        if (!confirm('Are you sure you want to perform this action?')) return;
                        
                        const code = new URLSearchParams(window.location.search).get('code');
                        try {
                            const resp = await fetch(endpoint + '?code=' + code, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body)
                            });
                            const result = await resp.json();
                            if (result.success) {
                                location.reload();
                            } else {
                                alert('Error: ' + result.error);
                            }
                        } catch (e) {
                            alert('Technical failure: ' + e.message);
                        }
                    }
                </script>
            </head>
            <body>
                <div class="container">
                    <h1>Identity Management</h1>
                    
                    <h2>Linked Telegram Users</h2>
                    ${users.length === 0 ? '<div class="no-data">No users linked yet.</div>' : `
                    <table>
                        <thead>
                            <tr>
                                <th>App User ID</th>
                                <th>Telegram UID</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr>
                                    <td><strong>${u.userId}</strong></td>
                                    <td><span class="badge">${u.telegramUserId}</span></td>
                                    <td>
                                        <button class="btn btn-danger" onclick="performAction('unlink-user', { userId: '${u.userId}' })">Terminate Link</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    `}

                    <h2>Active Registration Tokens</h2>
                    <p style="color: #64748b; font-size: 14px;">One-time use tokens. Expire after 20 minutes.</p>
                    ${tokens.length === 0 ? '<div class="no-data">No active tokens found.</div>' : `
                    <table>
                        <thead>
                            <tr>
                                <th>Linking Token</th>
                                <th>User ID</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tokens.map(t => {
            const expiresAt = new Date(t.createdAt.getTime() + 20 * 60 * 1000);
            const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 60000));
            return `
                                    <tr>
                                        <td><code>${t.token}</code></td>
                                        <td>${t.userId}</td>
                                        <td>
                                            <span class="badge" style="background: ${diff < 5 ? '#fef2f2' : '#ecfdf5'}; color: ${diff < 5 ? '#991b1b' : '#065f46'};">
                                                ${diff}m remaining
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn btn-danger" onclick="performAction('revoke-token', { token: '${t.token}' })">Revoke</button>
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                    `}
                </div>
            </body>
            </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send('Error fetching data from database.');
    }
});

module.exports = router;
