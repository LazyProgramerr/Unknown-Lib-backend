# Telegram OTP Authentication Backend

## Overview
This repository provides a production‑ready backend for OTP authentication via a Telegram bot. It is built with **Node.js**, **Express**, and **MongoDB (Mongoose)**. The flow is:
1. Android app requests a deep‑link token.
2. Backend returns a Telegram deep‑link (`https://t.me/<BOT_USERNAME>?start=<token>`).
3. User opens the link, presses **Start**, and the bot links the Telegram `chatId` to the app `userId`.
4. Android app requests an OTP – the backend generates a 6‑digit code, stores a SHA‑256 hash, and sends the plain OTP via the Telegram bot.
5. Android app verifies the OTP – the backend checks the hash, enforces a 5 min expiry and single‑use.

## Features
- Secure 6‑digit OTPs, hashed with SHA‑256 before storage.
- OTP expires after **5 minutes** and can be used only once.
- Rate‑limited to **5 OTP requests per minute** per user.
- Automatic cleanup of expired OTPs and link tokens via MongoDB TTL indexes.
- No secrets are hard‑coded; all configuration comes from environment variables.
- Fully modular codebase (config, models, services, routes).
- **Secure Admin Dashboard**: Protected web view to see linked users.
- **Strict 1:1 Binding**: One Telegram account per app account.
- **Account Unlinking**: Ability to disconnect and change Telegram accounts.
- **Failure Recovery**: Automatic "Repair Link" generation if bot is blocked.

## Prerequisites
- **Node.js**: [Download & Install Node.js (LTS)](https://nodejs.org/) (Required to run the server)
- **MongoDB**: [Download & Install MongoDB Community Server](https://www.mongodb.com/try/download/community) (Required database)
- **Telegram Bot**: Created via [@BotFather](https://t.me/BotFather)
- **Public Webhook URL**: Use [ngrok](https://ngrok.com/) for local testing

## Setup
1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd <repo-directory>
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Create an `.env` file** (copy from `.env.example`)
   ```bash
   cp .env.example .env
   ```
   Fill in the values:
   - `PORT` – server port (default 3000)
   - `MONGO_URI` – MongoDB connection string
   - `TELEGRAM_BOT_TOKEN` – token from @BotFather
   - `TELEGRAM_BOT_USERNAME` – bot username **without** the leading `@`
   - `TELEGRAM_WEBHOOK_URL` – publicly reachable URL ending with `/telegram/webhook`
4. **Start the server**
   ```bash
   npm run start
   ```
   The server will connect to MongoDB, start Express on the configured port, and set the Telegram webhook.

## Docker Usage (Recommended)
You can run the entire stack (Node.js + MongoDB) without local installation using Docker.

1. **Configure `.env`**
   Ensure your `.env` file has the correct `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and `TELEGRAM_WEBHOOK_URL`.
   Note: `MONGO_URI` in `.env` is ignored by Docker Compose (it uses the internal container network).

2. **Start Services**
   ```bash
   docker-compose up --build
   ```
   This will start both the backend (port 3000) and MongoDB (port 27017).

3. **Verify**
   The app will be accessible at `http://localhost:3000`.

## Deployment
- **Render.com**: See [RENDER_DEPLOY.md](./RENDER_DEPLOY.md) for step-by-step instructions.

## Client Integration
For details on how to integrate this backend with an **Android** app, see [ANDROID_GUIDE.md](./ANDROID_GUIDE.md).

## API Endpoints
All endpoints are prefixed with `/otp`.
- **POST `/otp/link-token`** – body `{ "userId": "<app_user_id>" }`
  Returns `{ "deepLink": "https://t.me/<BOT_USERNAME>?start=<token>" }`
- **POST `/otp/request-otp`** – body `{ "userId": "<app_user_id>" }`
  Sends a 6‑digit OTP to the linked Telegram chat.
- **POST `/otp/verify`** – body `{ "userId": "<app_user_id>", "otp": "123456" }`
  Returns `{ "success": true }` on valid OTP.
- **POST `/otp/unlink`** – body `{ "userId": "<app_user_id>" }`
  Removes the Telegram link for given user.

## Admin Dashboard
The backend provides a secure dashboard at `/admin/dashboard`.
- **Access**: Requires the `code` query parameter (e.g., `/admin/dashboard?code=YOUR_SECRET_CODE`).
- **Security**: Disabled if `ADMIN_ACCESS_CODE` is not set. Features anti‑tamper protections (disables Inspect/Right‑Click).

## Telegram Webhook
Telegram will POST updates to `/telegram/webhook`. The server extracts the `/start <token>` payload, validates the token, and stores the mapping between `userId` and Telegram `chatId`.

## Security Considerations
- OTPs are never stored in plain text – only a SHA‑256 hash is persisted.
- Rate limiting prevents brute‑force attacks.
- All secrets are loaded from environment variables; **do not commit `.env`**.
- The bot can only message users after they press **Start**, complying with Telegram policies.

## Cleanup & Maintenance
- MongoDB TTL indexes automatically delete expired OTP documents and link tokens.
- In‑memory rate‑limit counters reset each minute.

## License
MIT – feel free to use and adapt.
