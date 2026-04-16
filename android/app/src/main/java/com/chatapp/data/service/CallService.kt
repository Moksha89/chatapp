package com.chatapp.data.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.chatapp.R
import com.chatapp.presentation.MainActivity

class CallService : Service() {

    companion object {
        private const val TAG = "CallService"
        private const val CHANNEL_ID = "call_channel"
        private const val NOTIFICATION_ID = 1001
        const val ACTION_START_CALL = "com.chatapp.START_CALL"
        const val ACTION_END_CALL = "com.chatapp.END_CALL"
        const val EXTRA_CALLER_NAME = "caller_name"
        const val EXTRA_CALL_TYPE = "call_type"
        const val EXTRA_IS_INCOMING = "is_incoming"

        fun startCallService(context: Context, callerName: String, callType: String, isIncoming: Boolean) {
            val intent = Intent(context, CallService::class.java).apply {
                action = ACTION_START_CALL
                putExtra(EXTRA_CALLER_NAME, callerName)
                putExtra(EXTRA_CALL_TYPE, callType)
                putExtra(EXTRA_IS_INCOMING, isIncoming)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopCallService(context: Context) {
            val intent = Intent(context, CallService::class.java).apply {
                action = ACTION_END_CALL
            }
            context.startService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_CALL -> {
                val callerName = intent.getStringExtra(EXTRA_CALLER_NAME) ?: "Unknown"
                val callType = intent.getStringExtra(EXTRA_CALL_TYPE) ?: "voice"
                val isIncoming = intent.getBooleanExtra(EXTRA_IS_INCOMING, false)
                startForegroundCall(callerName, callType, isIncoming)
            }
            ACTION_END_CALL -> {
                Log.d(TAG, "Stopping call service")
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Ongoing call notifications"
                setSound(null, null)
                enableVibration(false)
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundCall(callerName: String, callType: String, isIncoming: Boolean) {
        Log.d(TAG, "Starting foreground call: $callerName, type=$callType, incoming=$isIncoming")

        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (isIncoming) "Incoming ${callType} call" else "Ongoing ${callType} call"
        val text = if (isIncoming) "$callerName is calling..." else "In call with $callerName"

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }
}
