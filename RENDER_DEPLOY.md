# Deployment Guide: Render.com

This document provides instructions for deploying the Telegram OTP Service to the **Render** cloud platform using **MongoDB Atlas** as the persistence layer.

## Phase 1: Database Provisioning (MongoDB Atlas)

Render provides localized ephemeral storage. For persistent data, utilize a managed provider like MongoDB Atlas.

1.  **Cluster Creation**: Provision a shared cluster in your preferred region.
2.  **Access Control**:
    *   Initialize a database user with read/write permissions.
    *   Configure Network Access to allow connections from `0.0.0.0/0` (required as Render utilizes dynamic outbound IP addresses).
3.  **Connection String**: Acquire the SRV connection string (e.g., `mongodb+srv://<user>:<password>@cluster.mongodb.net/`).

## Phase 2: Render Service Configuration

1.  **Service Creation**: Select **New +** > **Web Service** in the Render Dashboard.
2.  **Repository Binding**: Connect your GitHub/GitLab repository.
3.  **Build Settings**:
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
4.  **Environment Variables**:
    *   `MONGO_URI`: Your MongoDB Atlas connection string.
    *   `TELEGRAM_BOT_TOKEN`: The API token for your bot.
    *   `TELEGRAM_BOT_USERNAME`: The username of your bot (exclude `@`).
    *   `ADMIN_ACCESS_CODE`: A secure string for dashboard authentication.
    *   `TELEGRAM_WEBHOOK_URL`: The intended public endpoint (e.g., `https://your-app.onrender.com/telegram/webhook`).

## Phase 3: Finalizing Telegram Integration

To transition the bot from polling to webhook delivery:

1.  Confirm the `TELEGRAM_WEBHOOK_URL` in the Render environment settings matches your live service URL.
2.  Deploy the service.
3.  Review the Render logs to confirm the message: `"Telegram webhook set to https://..."`.

## Post-Deployment Validation

Execute a health check by initiating a linking request via the public API:

```bash
curl -X POST https://your-service.onrender.com/otp/link-token \
     -H "Content-Type: application/json" \
     -d '{"userId": "provision_test_01"}'
```

The system should return a valid Telegram deep link.
