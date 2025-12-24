# Deploying to Render.com

This guide covers deploying the Node.js backend to **Render** and connecting it to a **MongoDB Atlas** database.

## Prerequisites
1. **GitHub Repository**: Push this code to a public or private GitHub repository.
2. **MongoDB Atlas Account**: [Create one here](https://www.mongodb.com/cloud/atlas/register).
3. **Render Account**: [Create one here](https://render.com/).

---

## Step 1: Set up MongoDB Atlas (Database)

Render does not host persistent MongoDB databases. Use MongoDB Atlas (free tier available).

1. **Create a Cluster**: Log in to Atlas and build a **Shared (Free)** cluster.
2. **Create a Database User**: Go to **Database Access** → Add New Database User (e.g., `app_user` / `password123`).
3. **Network Access**: Go to **Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`).
    > *Note: Render IPs change, so `0.0.0.0/0` is the easiest configuration.*
4. **Get Connection String**:
   - Click **Connect** → **Connect your application**.
   - Copy the string. It looks like: `mongodb+srv://app_user:password123@cluster0.abc.mongodb.net/?retryWrites=true&w=majority`.

---

## Step 2: Create a Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your **GitHub account** and select the repository you just pushed.
4. **Configure Service**:
   - **Name**: `telegram-otp-backend` (or similar)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or appropriate paid tier)

---

## Step 3: Configure Environment Variables

Scroll down to the **Environment Variables** section on the Render setup page (or in the "Environment" tab after creation). Add the following:

| Key | Value | Note |
| :--- | :--- | :--- |
| `MONGO_URI` | `mongodb+srv://...` | Your Atlas connection string from Step 1. |
| `TELEGRAM_BOT_TOKEN` | `123456:ABC-DEF...` | Your Bot Token |
| `TELEGRAM_BOT_USERNAME` | `OtpVantaBot` | Your Bot Username (no `@`) |
| `TELEGRAM_WEBHOOK_URL` | `https://your-app-name.onrender.com/telegram/webhook` | **Wait!** See below. |
| `ADMIN_ACCESS_CODE` | `your_secret_code` | Secret code to protect your admin dashboard. |

> **Important**: You won't know your exact Render URL (`your-app-name.onrender.com`) until *after* you click "Create Web Service".
> For the first deployment, you can leave `TELEGRAM_WEBHOOK_URL` blank (the bot will use polling mode temporarily) OR fill it in if Render previews the URL name.

---

## Step 4: Finalize Deployment

1. Click **Create Web Service**.
2. Render will clone the repo, run `npm install`, and start the app.
3. Watch the logs. You should see: `Server listening on port 10000` (Render sets port automatically).

---

## Step 5: Set the Webhook URL

1. Copy your live app URL from the top left of the Render dashboard (e.g., `https://telegram-otp-backend.onrender.com`).
2. Go to the **Environment** tab.
3. Add/Update `TELEGRAM_WEBHOOK_URL` to:
   `https://telegram-otp-backend.onrender.com/telegram/webhook`
4. **Save Changes**. Render will restart the service.
5. Check logs: You should see `"Telegram webhook set to ..."`

## Verification

1. **Test Link**: POST `https://your-app.onrender.com/otp/link-token` with `{ "userId": "test_render" }`.
2. **Open Link**: Click the returned Telegram link.
3. **Request OTP**: POST `https://your-app.onrender.com/otp/request-otp` with `{ "userId": "test_render" }`.

**Done!** Your backend is live.
