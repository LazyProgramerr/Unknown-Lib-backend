# Telegram OTP Service

A secure, scalable backend service for Telegram-based One-Time Password (OTP) authentication. This system enables developers to integrate Telegram as a secure delivery channel for identity verification within mobile or web applications.

## System Architecture

The service facilitates a 1:1 binding between an application user and a Telegram account using a secure deep-linking protocol.

1.  **Link Generation**: The application requests a unique registration token.
2.  **Account Binding**: The user is redirected to the Telegram Bot via a deep link. Upon interaction, the backend establishes a permanent 1:1 mapping between the application `userId` and the Telegram **UID**.
3.  **OTP Delivery**: Once linked, the application can request OTPs which are delivered instantly to the user's Telegram account.
4.  **Verification**: The backend verifies the cryptographic hash of the provided OTP, enforcing expiration and single-use constraints.

## Core Features

*   **Cryptographic Security**: OTPs are hashed using SHA-256 before persistence; plain-text values are never stored.
*   **Persistent Identity**: Utilizes Telegram's permanent User UID for identity mapping, ensuring link stability even across chat deletions or username changes.
*   **Adaptive Security Policies**:
    *   **OTP Expiration**: 5-minute validity window.
    *   **Linking Window**: 20-minute generosity for manual setup.
    *   **Rate Limiting**: Integrated threshold of 5 requests per minute per user to prevent abuse.
*   **Intelligent Logic**: Automated handling of blocked bots with "Repair Link" recovery flow.
*   **Administrative Oversight**: Secure dashboard with anti-tamper protections for real-time monitoring of linked identities and active sessions.

## Technical Stack

*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MongoDB (Mongoose)
*   **Bot API**: node-telegram-bot-api

## Deployment & Setup

### Environment Configuration
Copy `.env.example` to `.env` and configure the following:

| Variable | Description |
| :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | API Token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_BOT_USERNAME` | The username of your bot (e.g., `OtpVantaBot`) |
| `TELEGRAM_WEBHOOK_URL` | Public HTTPS endpoint for receiving Telegram updates |
| `MONGO_URI` | MongoDB connection string |
| `ADMIN_ACCESS_CODE` | Secret key for dashboard authorization |

### Standard Installation
```bash
npm install
npm start
```

### Containerized Environment (Recommended)
```bash
docker-compose up -d --build
```

## API Documentation

### 🟢 `POST /otp/link-token`
Initiates the linking process.
*   **Request**: `{ "userId": "app_user_123" }`
*   **Response**: `{ "deepLink": "https://t.me/your_bot?start=token" }`

### 🟢 `POST /otp/request-otp`
Sends a verification code to the linked account.
*   **Request**: `{ "userId": "app_user_123" }`
*   **Response**: `{ "success": true }`

### 🟢 `POST /otp/verify`
Validates a submitted code.
*   **Request**: `{ "userId": "app_user_123", "otp": "123456" }`
*   **Response**: `{ "success": true }`

## Project Documentation
*   [Android Integration Guide](./ANDROID_GUIDE.md)
*   [Deployment Guide](./RENDER_DEPLOY.md)

## License
Provided under the MIT License.
