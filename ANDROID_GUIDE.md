# Android Integration Guide

This guide provides a reference for integrating the Telegram OTP backend into your Android application using **Kotlin** and **Retrofit**.

## 1. Dependencies

Add Retrofit and Gson converter to your `build.gradle` (Module: app):

```gradle
dependencies {
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
    // Coroutines support usually built-in or via adapter
}
```

## 2. API Interface

Define the endpoints matching the backend:

```kotlin
import retrofit2.http.Body
import retrofit2.http.POST

data class LinkTokenRequest(val userId: String)
data class LinkTokenResponse(val deepLink: String)

data class OtpRequest(val userId: String)
data class OtpResponse(val message: String)

data class VerifyRequest(val userId: String, val otp: String)
data class VerifyResponse(val success: Boolean)

interface ApiService {
    @POST("otp/link-token")
    suspend fun getLinkToken(@Body body: LinkTokenRequest): LinkTokenResponse

    @POST("otp/request-otp")
    suspend fun requestOtp(@Body body: OtpRequest): OtpResponse

    @POST("otp/verify")
    suspend fun verifyOtp(@Body body: VerifyRequest): VerifyResponse
}
```

## 3. Implementation Flow

### Step A: Initialize Retrofit

```kotlin
val retrofit = Retrofit.Builder()
    .baseUrl("http://<YOUR_BACKEND_IP>:3000/") // Use 10.0.2.2 for Android Emulator connecting to localhost
    .addConverterFactory(GsonConverterFactory.create())
    .build()

val api = retrofit.create(ApiService::class.java)
```

### Step B: Link Telegram Account (One-time setup)

Call this when the user wants to enable Telegram 2FA.

```kotlin
fun linkTelegramAccount(userId: String) {
    CoroutineScope(Dispatchers.IO).launch {
        try {
            val response = api.getLinkToken(LinkTokenRequest(userId))
            val deepLink = response.deepLink

            // Open Telegram App with the deep link
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
            context.startActivity(intent)

        } catch (e: Exception) {
            e.printStackTrace()
            // Handle error
        }
    }
}
```
*User Action:* The user taps "Start" in the Telegram bot.

### Step C: Request OTP (Login flow)

Call this when the user attempts to log in.

```kotlin
fun requestOtp(userId: String) {
    CoroutineScope(Dispatchers.IO).launch {
        try {
            api.requestOtp(OtpRequest(userId))
            withContext(Dispatchers.Main) {
                // Show UI to enter OTP
                showToast("OTP sent to your Telegram!")
            }
        } catch (e: Exception) {
            // Handle error (e.g. Rate limit, account not linked)
        }
    }
}
```

### Step D: Verify OTP

Submit the code entered by the user.

```kotlin
fun verifyOtp(userId: String, code: String) {
    CoroutineScope(Dispatchers.IO).launch {
        try {
            val response = api.verifyOtp(VerifyRequest(userId, code))
            withContext(Dispatchers.Main) {
                if (response.success) {
                    // Proceed to Home Screen
                    showToast("Login Successful!")
                } else {
                    showToast("Invalid OTP")
                }
            }
        } catch (e: Exception) {
            // Handle error (401 Unauthorized usually means invalid OTP)
        }
    }
}
```

## 4. Error Handling Notes
- **400 Bad Request**: Typically means `userId` is missing or the Telegram account is not linked yet.
- **401 Unauthorized**: Invalid or expired OTP.
- **Rate Limiting**: If you request OTPs too fast (>5/min), the backend will return an error. Handle this gracefully in UI.
