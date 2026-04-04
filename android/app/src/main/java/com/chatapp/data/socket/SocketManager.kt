package com.chatapp.data.socket

import android.content.Context
import android.util.Log
import com.chatapp.BuildConfig
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

sealed class SocketEvent {
    data class NewMessage(val chatId: String, val messageJson: JSONObject) : SocketEvent()
    data class MessageDelivered(val messageId: String) : SocketEvent()
    data class MessageRead(val messageId: String) : SocketEvent()
    data class TypingStart(val chatId: String, val userId: String, val userName: String) : SocketEvent()
    data class TypingStop(val chatId: String, val userId: String) : SocketEvent()
    data class UserOnline(val userId: String) : SocketEvent()
    data class UserOffline(val userId: String) : SocketEvent()
    data class IncomingCall(val callerId: String, val callerName: String, val callType: String, val chatId: String) : SocketEvent()
    data class CallAnswered(val chatId: String) : SocketEvent()
    data class CallRejected(val chatId: String) : SocketEvent()
    data class CallEnded(val chatId: String) : SocketEvent()
    data class MessageReaction(val messageId: String, val reactions: Map<String, List<String>>) : SocketEvent()
    data class MessageEdited(val messageId: String, val content: String) : SocketEvent()
    data class MessageDeleted(val messageId: String) : SocketEvent()
}

@Singleton
class SocketManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var socket: Socket? = null
    private val tag = "SocketManager"

    private val _events = MutableSharedFlow<SocketEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<SocketEvent> = _events.asSharedFlow()

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _onlineUsers = MutableStateFlow<Set<String>>(emptySet())
    val onlineUsers: StateFlow<Set<String>> = _onlineUsers.asStateFlow()

    private val _typingUsers = MutableStateFlow<Map<String, Set<String>>>(emptyMap())
    val typingUsers: StateFlow<Map<String, Set<String>>> = _typingUsers.asStateFlow()

    fun connect() {
        val prefs = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("access_token", null) ?: return

        try {
            val options = IO.Options().apply {
                auth = mapOf("token" to token)
                transports = arrayOf("websocket")
                reconnection = true
                reconnectionDelay = 1000
                reconnectionAttempts = 10
            }
            socket = IO.socket(BuildConfig.SOCKET_URL, options)
            setupListeners()
            socket?.connect()
        } catch (e: Exception) {
            Log.e(tag, "Socket connection error", e)
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        _isConnected.value = false
        _onlineUsers.value = emptySet()
        _typingUsers.value = emptyMap()
    }

    private fun setupListeners() {
        socket?.apply {
            on(Socket.EVENT_CONNECT) {
                Log.d(tag, "Socket connected")
                _isConnected.value = true
                emit("presence:online", JSONObject())
            }

            on(Socket.EVENT_DISCONNECT) {
                Log.d(tag, "Socket disconnected")
                _isConnected.value = false
            }

            on("message:new") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val chatId = data.optString("chatId", "")
                    _events.tryEmit(SocketEvent.NewMessage(chatId, data))
                }
            }

            on("message:delivered") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val messageId = data.optString("messageId", "")
                    _events.tryEmit(SocketEvent.MessageDelivered(messageId))
                }
            }

            on("message:read") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val messageId = data.optString("messageId", "")
                    _events.tryEmit(SocketEvent.MessageRead(messageId))
                }
            }

            on("typing:start") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val chatId = data.optString("chatId", "")
                    val userId = data.optString("userId", "")
                    val userName = data.optString("userName", "")
                    _typingUsers.value = _typingUsers.value.toMutableMap().apply {
                        val current = get(chatId)?.toMutableSet() ?: mutableSetOf()
                        current.add(userId)
                        put(chatId, current)
                    }
                    _events.tryEmit(SocketEvent.TypingStart(chatId, userId, userName))
                }
            }

            on("typing:stop") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val chatId = data.optString("chatId", "")
                    val userId = data.optString("userId", "")
                    _typingUsers.value = _typingUsers.value.toMutableMap().apply {
                        val current = get(chatId)?.toMutableSet() ?: mutableSetOf()
                        current.remove(userId)
                        if (current.isEmpty()) remove(chatId) else put(chatId, current)
                    }
                    _events.tryEmit(SocketEvent.TypingStop(chatId, userId))
                }
            }

            on("presence:online") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val userId = data.optString("userId", "")
                    _onlineUsers.value = _onlineUsers.value + userId
                    _events.tryEmit(SocketEvent.UserOnline(userId))
                }
            }

            on("presence:offline") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val userId = data.optString("userId", "")
                    _onlineUsers.value = _onlineUsers.value - userId
                    _events.tryEmit(SocketEvent.UserOffline(userId))
                }
            }

            on("call:incoming") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.IncomingCall(
                        callerId = data.optString("callerId", ""),
                        callerName = data.optString("callerName", ""),
                        callType = data.optString("callType", "voice"),
                        chatId = data.optString("chatId", "")
                    ))
                }
            }

            on("call:answered") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.CallAnswered(data.optString("chatId", "")))
                }
            }

            on("call:rejected") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.CallRejected(data.optString("chatId", "")))
                }
            }

            on("call:ended") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.CallEnded(data.optString("chatId", "")))
                }
            }

            on("message:reaction") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val messageId = data.optString("messageId", "")
                    _events.tryEmit(SocketEvent.MessageReaction(messageId, emptyMap()))
                }
            }

            on("message:edited") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.MessageEdited(
                        data.optString("messageId", ""),
                        data.optString("content", "")
                    ))
                }
            }

            on("message:deleted") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.MessageDeleted(data.optString("messageId", "")))
                }
            }
        }
    }

    fun sendMessage(chatId: String, content: String, type: String = "text", tempId: String? = null, replyToMessageId: String? = null) {
        val data = JSONObject().apply {
            put("chatId", chatId)
            put("content", content)
            put("type", type)
            tempId?.let { put("tempId", it) }
            replyToMessageId?.let { put("replyToMessageId", it) }
        }
        socket?.emit("message:send", data)
    }

    fun sendTypingStart(chatId: String) {
        socket?.emit("typing:start", JSONObject().put("chatId", chatId))
    }

    fun sendTypingStop(chatId: String) {
        socket?.emit("typing:stop", JSONObject().put("chatId", chatId))
    }

    fun initiateCall(chatId: String, targetUserId: String, callType: String) {
        val data = JSONObject().apply {
            put("chatId", chatId)
            put("targetUserId", targetUserId)
            put("callType", callType)
        }
        socket?.emit("call:initiate", data)
    }

    fun answerCall(chatId: String) {
        socket?.emit("call:answer", JSONObject().put("chatId", chatId))
    }

    fun rejectCall(chatId: String) {
        socket?.emit("call:reject", JSONObject().put("chatId", chatId))
    }

    fun endCall(chatId: String) {
        socket?.emit("call:end", JSONObject().put("chatId", chatId))
    }

    fun markDelivered(messageId: String) {
        socket?.emit("message:delivered", JSONObject().put("messageId", messageId))
    }

    fun markRead(chatId: String, messageIds: List<String>) {
        val data = JSONObject().apply {
            put("chatId", chatId)
            put("messageIds", org.json.JSONArray(messageIds))
        }
        socket?.emit("message:read", data)
    }
}
