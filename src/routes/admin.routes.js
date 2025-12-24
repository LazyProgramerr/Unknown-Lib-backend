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

// 1. JSON API for Dashboard Data
router.get('/api/data', checkAdmin, async (req, res) => {
    try {
        const users = await TelegramUser.find({});
        const tokens = await TelegramLink.find({});
        res.json({
            success: true,
            users: users.map(u => ({ userId: u.userId, telegramUserId: u.telegramUserId })),
            tokens: tokens.map(t => {
                const expiresAt = new Date(t.createdAt.getTime() + 20 * 60 * 1000);
                const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 60000));
                return { token: t.token, userId: t.userId, diff };
            })
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. Unlink User
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

// 3. Revoke Linking Token
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

// 4. Admin Dashboard (HTML)
router.get('/dashboard', async (req, res) => {
    if (!adminAccessCode) {
        return res.status(503).send('<h1>Service Unavailable</h1><p>Admin dashboard is not configured.</p>');
    }

    const { code } = req.query;
    if (code !== adminAccessCode) {
        return res.status(403).send('<h1>Forbidden</h1><p>Invalid access code.</p>');
    }

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Identity Management</title>
            <style>
                body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; }
                .container { max-width: 1100px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                h1 { color: #2563eb; margin: 0; font-weight: 700; letter-spacing: -0.025em; }
                .status-ind { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 8px; }
                .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
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
                .no-data { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; }
                code { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-family: ui-monospace, monospace; font-size: 13px; }
            </style>
            <script>
                const code = new URLSearchParams(window.location.search).get('code');

                async function performAction(endpoint, body) {
                    if (!confirm('Are you sure?')) return;
                    try {
                        const resp = await fetch(endpoint + '?code=' + code, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body)
                        });
                        const result = await resp.json();
                        if (result.success) updateData();
                        else alert('Error: ' + result.error);
                    } catch (e) { alert('Failure: ' + e.message); }
                }

                async function updateData() {
                    try {
                        const resp = await fetch('api/data?code=' + code);
                        const data = await resp.json();
                        if (!data.success) return;

                        // Update Users Table
                        const usersBody = document.getElementById('users-body');
                        if (data.users.length === 0) {
                            usersBody.innerHTML = '<tr><td colspan="3" class="no-data">No users linked yet.</td></tr>';
                        } else {
                            usersBody.innerHTML = data.users.map(u => \`
                                <tr>
                                    <td><strong>\${u.userId}</strong></td>
                                    <td><span class="badge">\${u.telegramUserId}</span></td>
                                    <td><button class="btn btn-danger" onclick="performAction('unlink-user', { userId: '\${u.userId}' })">Terminate</button></td>
                                </tr>
                            \`).join('');
                        }

                        // Update Tokens Table
                        const tokensBody = document.getElementById('tokens-body');
                        if (data.tokens.length === 0) {
                            tokensBody.innerHTML = '<tr><td colspan="4" class="no-data">No active tokens found.</td></tr>';
                        } else {
                            tokensBody.innerHTML = data.tokens.map(t => \`
                                <tr>
                                    <td><code>\${t.token}</code></td>
                                    <td>\${t.userId}</td>
                                    <td><span class="badge" style="background: \${t.diff < 5 ? '#fef2f2' : '#ecfdf5'}; color: \${t.diff < 5 ? '#991b1b' : '#065f46'};">\${t.diff}m left</span></td>
                                    <td><button class="btn btn-danger" onclick="performAction('revoke-token', { token: '\${t.token}' })">Revoke</button></td>
                                </tr>
                            \`).join('');
                        }
                        
                        document.getElementById('last-sync').textContent = new Date().toLocaleTimeString();
                    } catch (e) { 
                        console.error('Update failed', e);
                    }
                }

                setInterval(updateData, 5000);
                window.onload = updateData;
            </script>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Identity Management</h1>
                    <div class="status-ind">
                        <div class="dot"></div>
                        Live Sync: <span id="last-sync">Connecting...</span>
                    </div>
                </div>
                
                <h2>Linked Telegram Users</h2>
                <table>
                    <thead>
                        <tr><th>App User ID</th><th>Telegram UID</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="users-body">
                        <tr><td colspan="3" class="no-data">Loading users...</td></tr>
                    </tbody>
                </table>

                <h2>Active Registration Tokens</h2>
                <table>
                    <thead>
                        <tr><th>Token</th><th>User ID</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="tokens-body">
                        <tr><td colspan="4" class="no-data">Loading tokens...</td></tr>
                    </tbody>
                </table>
            </div>
        </body>
        </html>
    `;
    res.send(html);
});

module.exports = router;
