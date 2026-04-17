package com.app.abhichat.service

import com.app.abhichat.BuildConfig
import com.app.abhichat.data.api.ApiClient
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URI

object SocketManager {
    private var socket: Socket? = null
    private val listeners = mutableMapOf<String, MutableList<Pair<String, (Array<Any>) -> Unit>>>()
    private var listenerId = 0

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
            callbacks.forEach { (_, callback) ->
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
        if (socket?.connected() != true) {
            android.util.Log.w("Socket", "emit($event) failed: not connected")
            return
        }
        socket?.emit(event, data)
    }

    /**
     * Register a scoped listener. Returns a listener ID that can be used
     * with [off] to remove only THIS specific listener without affecting others.
     */
    fun on(event: String, callback: (Array<Any>) -> Unit): String {
        val id = "listener-${listenerId++}"
        listeners.getOrPut(event) { mutableListOf() }.add(id to callback)
        socket?.on(event) { args -> callback(args) }
        return id
    }

    /**
     * Remove a specific listener by ID (scoped), or remove ALL listeners
     * for an event if no ID is provided.
     */
    fun off(event: String, id: String? = null) {
        if (id == null) {
            listeners.remove(event)
            socket?.off(event)
        } else {
            listeners[event]?.removeAll { it.first == id }
            // Re-register remaining listeners (socket.io doesn't support removing individual)
            socket?.off(event)
            listeners[event]?.forEach { (_, cb) ->
                socket?.on(event) { args -> cb(args) }
            }
        }
    }

    fun isConnected(): Boolean = socket?.connected() == true
}
