package com.chatapp

import android.app.Application
import com.chatapp.data.service.NotificationHandler
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class ChatApplication : Application() {

    @Inject
    lateinit var notificationHandler: NotificationHandler

    override fun onCreate() {
        super.onCreate()
        // Start listening for socket events to show local notifications
        notificationHandler.startListening()
    }
}
