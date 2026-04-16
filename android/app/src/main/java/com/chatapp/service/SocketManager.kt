package com.chatapp.service

import com.chatapp.BuildConfig
import com.chatapp.data.api.ApiClient
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URI

object SocketManager {
    private var socket: Socket? = null
    private val listeners = mutableMapOf<String, MutableList<(Array<Any>) -> Unit>>()

    fun connect() {
        if (socket?.connected() == true) return

        val token = ApiClient.getToken() ?: return

        val opts = IO.Options().apply {
            auth = mapOf("token" to token)
            transports = arrayOf("polling", "websocket")
            reconnection = true
            reconnectionAttempts = 10
            reconnectionDelay = 1000
        }

        socket = IO.socket(URI.create("${BuildConfig.SOCKET_URL}/chat"), opts)

        socket?.on(Socket.EVENT_CONNECT) {
            android.util.Log.d("Socket", "Connected: ${socket?.id()}")
        }

        socket?.on(Socket.EVENT_DISCONNECT) {
            android.util.Log.d("Socket", "Disconnected")
        }

        socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
            android.util.Log.e("Socket", "Connection error: ${args.firstOrNull()}")
        }

        // Re-register stored listeners
        listeners.forEach { (event, callbacks) ->
            callbacks.forEach { callback ->
                socket?.on(event) { args -> callback(args) }
            }
        }

        socket?.connect()
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
    }

    fun emit(event: String, data: JSONObject) {
        socket?.emit(event, data)
    }

    fun on(event: String, callback: (Array<Any>) -> Unit) {
        listeners.getOrPut(event) { mutableListOf() }.add(callback)
        socket?.on(event) { args -> callback(args) }
    }

    fun off(event: String) {
        listeners.remove(event)
        socket?.off(event)
    }

    fun isConnected(): Boolean = socket?.connected() == true
}
