package com.app.abhichat.data.socket

import android.util.Log
import com.app.abhichat.BuildConfig
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URI

object SocketManager {
    private var socket: Socket? = null
    private var isConnected = false
    private const val TAG = "SocketManager"

    fun connect(token: String) {
        if (isConnected) return
        try {
            disconnect()
            val opts = IO.Options().apply {
                auth = mapOf("token" to token)
                transports = arrayOf("websocket", "polling")
                reconnection = true
                reconnectionDelay = 1000
                reconnectionAttempts = 10
            }
            socket = IO.socket(URI.create("${BuildConfig.API_URL}/chat"), opts)
            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Socket connected")
                isConnected = true
                startHeartbeat()
            }
            socket?.on(Socket.EVENT_DISCONNECT) { args ->
                Log.d(TAG, "Socket disconnected: ${args.firstOrNull()}")
                isConnected = false
            }
            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e(TAG, "Socket error: ${args.firstOrNull()}")
            }
            socket?.connect()
        } catch (e: Exception) {
            Log.e(TAG, "Socket connection failed", e)
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        isConnected = false
    }

    fun emit(event: String, data: JSONObject) {
        socket?.emit(event, data)
    }

    fun emit(event: String, data: JSONObject, ack: (Array<Any>) -> Unit) {
        socket?.emit(event, arrayOf(data), io.socket.client.Ack { args -> ack(args) })
    }

    fun on(event: String, listener: (Array<Any>) -> Unit) {
        socket?.on(event) { args -> listener(args) }
    }

    fun off(event: String) {
        socket?.off(event)
    }

    fun isConnected(): Boolean = isConnected

    private fun startHeartbeat() {
        Thread {
            while (isConnected) {
                try {
                    socket?.emit("heartbeat")
                    Thread.sleep(30000)
                } catch (e: Exception) {
                    break
                }
            }
        }.start()
    }
}
