package com.chatapp.data.service

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import javax.inject.Inject

/**
 * Handles incoming FCM push notifications.
 * When the app is in background/killed, the system shows the notification automatically.
 * When the app is in foreground, onMessageReceived is called and we use PushNotificationService
 * to show the notification locally (only if the user isn't viewing that chat).
 */
@AndroidEntryPoint
class ChatFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCMService"
    }

    @Inject
    lateinit var notificationHandler: NotificationHandler

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token: ${token.take(20)}...")
        // Register the new token with the backend
        registerTokenWithBackend(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "FCM message received: ${message.data}")

        val type = message.data["type"] ?: ""
        when (type) {
            "message" -> handleMessageNotification(message)
            "call" -> handleCallNotification(message)
            else -> {
                // If there's a notification payload, the system will handle display
                // when the app is in background. For foreground, show it manually.
                message.notification?.let { notification ->
                    val notificationService = PushNotificationService(this)
                    notificationService.showMessageNotification(
                        senderName = notification.title ?: "New Message",
                        message = notification.body ?: "",
                        chatId = message.data["chatId"] ?: "default"
                    )
                }
            }
        }
    }

    private fun handleMessageNotification(message: RemoteMessage) {
        val chatId = message.data["chatId"] ?: ""
        val senderName = message.data["senderName"] ?: message.notification?.title ?: "New Message"
        val content = message.data["content"] ?: message.notification?.body ?: "Sent a message"

        // Don't show notification if user is currently viewing this chat
        if (chatId == notificationHandler.activeChatId) return

        val notificationService = PushNotificationService(this)
        notificationService.showMessageNotification(
            senderName = senderName,
            message = content,
            chatId = chatId
        )
    }

    private fun handleCallNotification(message: RemoteMessage) {
        val callerName = message.data["callerName"] ?: message.notification?.title ?: "Unknown"
        val callType = message.data["callType"] ?: "voice"

        val notificationService = PushNotificationService(this)
        notificationService.showCallNotification(
            callerName = callerName,
            isVideo = callType == "video"
        )
    }

    private fun registerTokenWithBackend(token: String) {
        // Use OkHttp directly to register token since we don't have Retrofit in service context
        val prefs = getSharedPreferences("auth_prefs", MODE_PRIVATE)
        val accessToken = prefs.getString("access_token", null) ?: return

        Thread {
            try {
                val client = okhttp3.OkHttpClient()
                val json = org.json.JSONObject().apply {
                    put("token", token)
                    put("platform", "android")
                }
                val body = okhttp3.RequestBody.create(
                    "application/json".toMediaTypeOrNull(),
                    json.toString()
                )
                val request = okhttp3.Request.Builder()
                    .url("https://abhi.so/notifications/register-token")
                    .addHeader("Authorization", "Bearer $accessToken")
                    .post(body)
                    .build()
                val response = client.newCall(request).execute()
                Log.d(TAG, "FCM token registered with backend: ${response.code}")
                response.close()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to register FCM token with backend", e)
            }
        }.start()
    }
}
