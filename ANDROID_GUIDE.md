# Android Integration Guide

This document outlines the protocol for integrating the Telegram OTP Service into an Android application using **Kotlin** and **Retrofit**.

## 1. Network Configuration

### Dependencies
Add the following to your `build.gradle` (Module: app):

```gradle
dependencies {
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
}
```

## 2. API Contract

Define the following interface to interact with the authentication endpoints.

```kotlin
import retrofit2.http.Body
import retrofit2.http.POST

data class LinkTokenRequest(val userId: String)
data class LinkTokenResponse(val deepLink: String)

data class OtpRequest(val userId: String)
data class OtpResponse(val success: Boolean, val message: String)

data class VerifyRequest(val userId: String, val otp: String)
data class VerifyResponse(val success: Boolean)

interface AuthenticationService {
    @POST("otp/link-token")
    suspend fun requestLinking(@Body body: LinkTokenRequest): LinkTokenResponse

    @POST("otp/request-otp")
    suspend fun deliverOtp(@Body body: OtpRequest): OtpResponse

    @POST("otp/verify")
    suspend fun validateOtp(@Body body: VerifyRequest): VerifyResponse

    @POST("otp/unlink")
    suspend fun disconnectTelegram(@Body body: UnlinkRequest): UnlinkResponse
}

data class UnlinkRequest(val userId: String)
data class UnlinkResponse(val success: Boolean, val message: String?)
```

## 3. Integration Lifecycle

### Phase 1: Identity Binding
To secure an account with Telegram, call `requestLinking`. The user will be redirected to the Telegram app to finalize the connection.

```kotlin
fun initiateTelegramLinking(userId: String) {
    scope.launch(Dispatchers.IO) {
        try {
            val response = api.requestLinking(LinkTokenRequest(userId))
            // Launch Telegram Deep Link
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(response.deepLink))
            context.startActivity(intent)
        } catch (e: Exception) {
            handleError(e)
        }
    }
}
```

### Phase 2: OTP Challenge
During authentication, trigger the OTP delivery.

```kotlin
fun challengeUser(userId: String) {
    scope.launch(Dispatchers.IO) {
        try {
            api.deliverOtp(OtpRequest(userId))
            view.showOtpEntry()
        } catch (e: Exception) {
            // Handle rate limits or unlinked accounts
        }
    }
}
```

### Phase 3: Resolution
Submit the user-entered code for validation.

```kotlin
fun resolveChallenge(userId: String, code: String) {
    scope.launch(Dispatchers.IO) {
        val response = api.validateOtp(VerifyRequest(userId, code))
        if (response.success) {
            onAuthenticationSuccess()
        } else {
            onAuthenticationFailure()
        }
    }
}
```

## 4. Error Resolution Flow

### Bot Blockage (HTTP 403)
If the backend returns a `403 Forbidden` status with a `repairLink`, the user has likely blocked the bot.

**Recommended UI Strategy:**
1. Display a "Secure Connection Lost" notification.
2. Provide a "Reconnect" button that opens the `repairLink` provided in the JSON response.

```json
{
  "success": false,
  "error": "BOT_BLOCKED",
  "repairLink": "https://t.me/your_bot?start=recovery_token"
}
```

## 5. Security Best Practices
*   **Persistent Storage**: Store the `userId` securely (e.g., EncryptedSharedPreferences).
*   **Rate Limits**: Implement UI-level cooldowns to match the backend threshold of 5 requests per minute.
*   **Transport Layer**: Always use HTTPS in production environments.
