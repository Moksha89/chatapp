package com.chatapp.data.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.chatapp.R
import com.chatapp.data.socket.SocketManager
import com.chatapp.presentation.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * Foreground service that keeps the WebSocket connection alive even when
 * the app is in the background or swiped away from recent apps.
 * This is the standard approach used by WhatsApp, Telegram, etc. for
 * real-time message delivery without Firebase Cloud Messaging.
 */
@AndroidEntryPoint
class SocketForegroundService : Service() {

    companion object {
        private const val TAG = "SocketForegroundService"
        private const val CHANNEL_ID = "socket_service"
        private const val NOTIFICATION_ID = 2001
        const val ACTION_START = "com.chatapp.START_SOCKET_SERVICE"
        const val ACTION_STOP = "com.chatapp.STOP_SOCKET_SERVICE"

        fun start(context: Context) {
            val intent = Intent(context, SocketForegroundService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, SocketForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    @Inject
    lateinit var socketManager: SocketManager

    @Inject
    lateinit var notificationHandler: NotificationHandler

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        Log.d(TAG, "SocketForegroundService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                Log.d(TAG, "Starting socket foreground service")
                startForegroundNotification()
                acquireWakeLock()
                ensureSocketConnected()
            }
            ACTION_STOP -> {
                Log.d(TAG, "Stopping socket foreground service")
                releaseWakeLock()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
        }
        // START_STICKY: if the system kills this service, it will restart it
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        releaseWakeLock()
        Log.d(TAG, "SocketForegroundService destroyed")
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        // App was swiped away from recent apps — ensure socket stays connected
        Log.d(TAG, "Task removed (app swiped away), keeping socket alive")
        ensureSocketConnected()
    }

    private fun ensureSocketConnected() {
        if (!socketManager.isConnected.value) {
            Log.d(TAG, "Socket not connected, reconnecting...")
            socketManager.connect()
        } else {
            Log.d(TAG, "Socket already connected")
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "chatapp:socket_wakelock"
            ).apply {
                acquire(10 * 60 * 1000L) // 10 minutes, will re-acquire on heartbeat
            }
            Log.d(TAG, "WakeLock acquired")
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
                Log.d(TAG, "WakeLock released")
            }
        }
        wakeLock = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Chat Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps you connected for instant message delivery"
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundNotification() {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Abhi Chat")
            .setContentText("Connected - receiving messages")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }
}
