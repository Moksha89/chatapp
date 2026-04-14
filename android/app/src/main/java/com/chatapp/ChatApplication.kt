package com.chatapp

import android.app.Application
import android.content.Context
import com.chatapp.data.service.NotificationHandler
import com.chatapp.data.service.SocketForegroundService
import com.chatapp.data.socket.SocketManager
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
        // Start foreground service to keep socket alive when app is backgrounded/closed.
        // Only start if user is logged in (has auth token).
        val prefs = getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("access_token", null)
        if (token != null) {
            SocketForegroundService.start(this)
        }
    }
}
