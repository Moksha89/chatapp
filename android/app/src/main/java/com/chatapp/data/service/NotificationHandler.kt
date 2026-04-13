package com.chatapp.data.service

import android.content.Context
import android.util.Log
import com.chatapp.data.socket.SocketEvent
import com.chatapp.data.socket.SocketManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles showing local notifications when new messages arrive
 * for chats the user isn't currently viewing.
 */
@Singleton
class NotificationHandler @Inject constructor(
    @ApplicationContext private val context: Context,
    private val socketManager: SocketManager
) {
    companion object {
        private const val TAG = "NotificationHandler"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val notificationService = PushNotificationService(context)

    // Track which chat the user is currently viewing (null = not in any chat)
    @Volatile
    var activeChatId: String? = null

    // Track current user ID to avoid self-notifications
    @Volatile
    var currentUserId: String? = null

    fun startListening() {
        scope.launch {
            socketManager.events.collect { event ->
                when (event) {
                    is SocketEvent.NewMessage -> handleNewMessage(event)
                    is SocketEvent.IncomingCall -> handleIncomingCall(event)
                    else -> { }
                }
            }
        }
        Log.d(TAG, "NotificationHandler started listening for socket events")
    }

    private fun handleNewMessage(event: SocketEvent.NewMessage) {
        val senderId = event.messageJson.optString("senderId", "")
        val senderName = event.messageJson.optString("senderName", "")
            .ifEmpty { event.messageJson.optString("sender", "Someone") }
            .ifEmpty { "New Message" }
        val content = event.messageJson.optString("content", "")
        val chatId = event.chatId

        // Don't show notification if:
        // 1. Message is from the current user
        // 2. User is currently viewing that chat
        if (senderId == currentUserId) return
        if (chatId == activeChatId) return

        Log.d(TAG, "Showing notification for message in chat=$chatId from $senderName")
        notificationService.showMessageNotification(
            senderName = senderName,
            message = content.ifEmpty { "Sent a message" },
            chatId = chatId
        )
    }

    private fun handleIncomingCall(event: SocketEvent.IncomingCall) {
        Log.d(TAG, "Showing notification for incoming call from ${event.callerName}")
        notificationService.showCallNotification(
            callerName = event.callerName,
            isVideo = event.callType == "video"
        )
    }
}
