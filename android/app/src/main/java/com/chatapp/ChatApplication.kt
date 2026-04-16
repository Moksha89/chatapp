package com.chatapp

import android.app.Application
import android.content.Context
import android.util.Log
import com.chatapp.data.service.NotificationHandler
import com.chatapp.data.socket.SocketManager
import com.google.firebase.messaging.FirebaseMessaging
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class ChatApplication : Application() {

    @Inject
    lateinit var notificationHandler: NotificationHandler

    @Inject
    lateinit var socketManager: SocketManager

    override fun onCreate() {
        super.onCreate()
        // Connect WebSocket early so real-time events flow from the start.
        // connect() is a no-op when there is no auth token (user not logged in).
        socketManager.connect()
        // Start listening for socket events to show local notifications
        notificationHandler.startListening()
        // Register FCM token with backend for push notifications when app is closed
        registerFcmToken()
    }

    private fun registerFcmToken() {
        val prefs = getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
        val accessToken = prefs.getString("access_token", null) ?: return

        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w("ChatApplication", "FCM token retrieval failed", task.exception)
                return@addOnCompleteListener
            }
            val fcmToken = task.result
            Log.d("ChatApplication", "FCM token: ${fcmToken.take(20)}...")

            // Register with backend
            Thread {
                try {
                    val client = okhttp3.OkHttpClient()
                    val json = org.json.JSONObject().apply {
                        put("token", fcmToken)
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
                    Log.d("ChatApplication", "FCM token registered: ${response.code}")
                    response.close()
                } catch (e: Exception) {
                    Log.e("ChatApplication", "Failed to register FCM token", e)
                }
            }.start()
        }
    }
}
