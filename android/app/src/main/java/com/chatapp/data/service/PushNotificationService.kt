package com.chatapp.data.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.chatapp.R
import com.chatapp.presentation.MainActivity

class PushNotificationService(private val context: Context) {

    companion object {
        const val CHANNEL_ID_MESSAGES = "messages"
        const val CHANNEL_ID_CALLS = "calls"
        const val CHANNEL_ID_GROUPS = "groups"
        const val CHANNEL_ID_MISSED_CALLS = "missed_calls"
        const val CALL_NOTIFICATION_ID = 9999
    }

    init {
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val messageChannel = NotificationChannel(
                CHANNEL_ID_MESSAGES,
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "New message notifications"
                enableVibration(true)
            }

            val callChannel = NotificationChannel(
                CHANNEL_ID_CALLS,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming call notifications"
                enableVibration(true)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .build()
                )
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }

            val missedCallChannel = NotificationChannel(
                CHANNEL_ID_MISSED_CALLS,
                "Missed Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Missed call notifications"
                enableVibration(true)
            }

            val groupChannel = NotificationChannel(
                CHANNEL_ID_GROUPS,
                "Groups",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Group message notifications"
            }

            notificationManager.createNotificationChannel(messageChannel)
            notificationManager.createNotificationChannel(callChannel)
            notificationManager.createNotificationChannel(groupChannel)
            notificationManager.createNotificationChannel(missedCallChannel)
        }
    }

    fun showMessageNotification(senderName: String, message: String, chatId: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("chatId", chatId)
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_MESSAGES)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(senderName)
            .setContentText(message)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(chatId.hashCode(), notification)
    }

    /**
     * P0-1 & P0-4: Full-screen incoming call notification with lock screen support.
     * Uses setFullScreenIntent() to show the call screen even when device is locked.
     * Includes accept/reject action buttons.
     */
    fun showCallNotification(
        callerName: String,
        isVideo: Boolean,
        callId: String = "",
        callerId: String = "",
        chatId: String = ""
    ) {
        // Full-screen intent - opens CallScreen directly
        val fullScreenIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("incoming_call", true)
            putExtra("caller_name", callerName)
            putExtra("call_type", if (isVideo) "video" else "voice")
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            putExtra("chat_id", chatId)
            action = "INCOMING_CALL"
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context, 1, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Accept action
        val acceptIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("accept_call", true)
            putExtra("caller_name", callerName)
            putExtra("call_type", if (isVideo) "video" else "voice")
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            putExtra("chat_id", chatId)
            action = "ACCEPT_CALL"
        }
        val acceptPendingIntent = PendingIntent.getActivity(
            context, 2, acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Reject action
        val rejectIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("reject_call", true)
            putExtra("call_id", callId)
            putExtra("caller_id", callerId)
            action = "REJECT_CALL"
        }
        val rejectPendingIntent = PendingIntent.getActivity(
            context, 3, rejectIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val callType = if (isVideo) "Video" else "Voice"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID_CALLS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Incoming $callType Call")
            .setContentText("$callerName is calling...")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setAutoCancel(false)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(R.mipmap.ic_launcher, "Accept", acceptPendingIntent)
            .addAction(R.mipmap.ic_launcher, "Decline", rejectPendingIntent)
            .setTimeoutAfter(45000)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(CALL_NOTIFICATION_ID, notification)
    }

    /**
     * P1-7: Missed call notification with one-tap callback button
     */
    fun showMissedCallNotification(callerName: String, isVideo: Boolean, chatId: String = "") {
        val callbackIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("callback_call", true)
            putExtra("caller_name", callerName)
            putExtra("call_type", if (isVideo) "video" else "voice")
            putExtra("chat_id", chatId)
            action = "CALLBACK_CALL"
        }
        val callbackPendingIntent = PendingIntent.getActivity(
            context, 4, callbackIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val callType = if (isVideo) "Video" else "Voice"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID_MISSED_CALLS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Missed $callType Call")
            .setContentText("$callerName tried to call you")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MISSED_CALL)
            .addAction(R.mipmap.ic_launcher, "Call Back", callbackPendingIntent)
            .build()

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(callerName.hashCode() + 1000, notification)
    }

    fun cancelCallNotification() {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(CALL_NOTIFICATION_ID)
    }
}
