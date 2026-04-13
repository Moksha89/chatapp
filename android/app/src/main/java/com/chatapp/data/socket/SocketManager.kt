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
import java.util.Timer
import java.util.TimerTask
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
    data class IncomingCall(val callId: String, val callerId: String, val callerName: String, val callType: String, val chatId: String, val offer: String? = null) : SocketEvent()
    data class CallAnswered(val callId: String, val chatId: String, val answer: String? = null) : SocketEvent()
    data class CallRejected(val callId: String, val chatId: String, val reason: String = "") : SocketEvent()
    data class CallEnded(val callId: String, val chatId: String, val duration: Int = 0) : SocketEvent()
    data class IceCandidateReceived(val callId: String, val candidateSdp: String, val sdpMid: String, val sdpMLineIndex: Int) : SocketEvent()
    data class MessageReaction(val messageId: String, val reactions: Map<String, List<String>>) : SocketEvent()
    data class MessageEdited(val messageId: String, val content: String) : SocketEvent()
    data class MessageDeleted(val messageId: String) : SocketEvent()
    data class FriendRequest(val friendshipId: String, val requesterId: String) : SocketEvent()
    data class FriendAccepted(val friendshipId: String, val acceptedBy: String) : SocketEvent()
    data class ChatUpdated(val chatId: String) : SocketEvent()
    data class MessageSent(val tempId: String, val messageId: String, val timestamp: String) : SocketEvent()
}

@Singleton
class SocketManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var socket: Socket? = null
    private var heartbeatTimer: Timer? = null
    private val tag = "SocketManager"

    private val _events = MutableSharedFlow<SocketEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<SocketEvent> = _events.asSharedFlow()

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _onlineUsers = MutableStateFlow<Set<String>>(emptySet())
    val onlineUsers: StateFlow<Set<String>> = _onlineUsers.asStateFlow()

    private val _typingUsers = MutableStateFlow<Map<String, Set<String>>>(emptyMap())
    val typingUsers: StateFlow<Map<String, Set<String>>> = _typingUsers.asStateFlow()

    // Track processed message IDs to prevent duplicates at the socket level
    private val processedMessageIds = LinkedHashSet<String>()
    private val MAX_PROCESSED_IDS = 200

    fun trackMessageId(id: String): Boolean {
        if (processedMessageIds.contains(id)) return false
        processedMessageIds.add(id)
        if (processedMessageIds.size > MAX_PROCESSED_IDS) {
            val iterator = processedMessageIds.iterator()
            iterator.next()
            iterator.remove()
        }
        return true
    }

    fun connect() {
        // Prevent multiple socket instances — disconnect existing one first
        if (socket != null) {
            Log.d(tag, "Disconnecting existing socket before reconnecting")
            disconnect()
        }

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
            // Backend WebSocket gateway uses namespace "/chat"
            val socketUrl = BuildConfig.SOCKET_URL.trimEnd('/') + "/chat"
            socket = IO.socket(socketUrl, options)
            setupListeners()
            socket?.connect()
        } catch (e: Exception) {
            Log.e(tag, "Socket connection error", e)
        }
    }

    fun disconnect() {
        stopHeartbeat()
        socket?.disconnect()
        socket?.off()
        socket = null
        _isConnected.value = false
        _onlineUsers.value = emptySet()
        _typingUsers.value = emptyMap()
    }

    private fun startHeartbeat() {
        stopHeartbeat()
        heartbeatTimer = Timer().apply {
            scheduleAtFixedRate(object : TimerTask() {
                override fun run() {
                    if (_isConnected.value) {
                        socket?.emit("heartbeat", JSONObject())
                        Log.d(tag, "Heartbeat sent")
                    }
                }
            }, 0L, 30_000L) // Send heartbeat every 30 seconds
        }
    }

    private fun stopHeartbeat() {
        heartbeatTimer?.cancel()
        heartbeatTimer = null
    }

    private fun setupListeners() {
        socket?.apply {
            on(Socket.EVENT_CONNECT) {
                Log.d(tag, "Socket connected")
                _isConnected.value = true
                emit("presence:online", JSONObject())
                startHeartbeat()
            }

            on(Socket.EVENT_DISCONNECT) {
                Log.d(tag, "Socket disconnected")
                _isConnected.value = false
            }

            on("message:new") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val chatId = data.optString("chatId", "")
                    // Backend sends { message: {...}, chatId: "..." }
                    // Extract the nested message object if present
                    val messageJson = if (data.has("message")) data.optJSONObject("message") ?: data else data
                    // Deduplicate at socket level — skip if we already processed this message ID
                    val msgId = messageJson.optString("id", "")
                    if (msgId.isNotEmpty() && !trackMessageId(msgId)) {
                        Log.d(tag, "Skipping duplicate message:new for id=$msgId")
                        return@on
                    }
                    _events.tryEmit(SocketEvent.NewMessage(chatId, messageJson))
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
                    // Backend sends messageIds (array), not messageId (singular)
                    val messageIdsArray = data.optJSONArray("messageIds")
                    if (messageIdsArray != null) {
                        for (i in 0 until messageIdsArray.length()) {
                            val mid = messageIdsArray.optString(i, "")
                            if (mid.isNotEmpty()) {
                                _events.tryEmit(SocketEvent.MessageRead(mid))
                            }
                        }
                    } else {
                        // Fallback for singular messageId
                        val messageId = data.optString("messageId", "")
                        if (messageId.isNotEmpty()) {
                            _events.tryEmit(SocketEvent.MessageRead(messageId))
                        }
                    }
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

            // Backend sends typing:indicator (not typing:start/typing:stop)
            on("typing:indicator") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val chatId = data.optString("chatId", "")
                    val userId = data.optString("userId", "")
                    val isTyping = data.optBoolean("isTyping", false)
                    _typingUsers.value = _typingUsers.value.toMutableMap().apply {
                        val current = get(chatId)?.toMutableSet() ?: mutableSetOf()
                        if (isTyping) current.add(userId) else current.remove(userId)
                        if (current.isEmpty()) remove(chatId) else put(chatId, current)
                    }
                    if (isTyping) {
                        _events.tryEmit(SocketEvent.TypingStart(chatId, userId, ""))
                    } else {
                        _events.tryEmit(SocketEvent.TypingStop(chatId, userId))
                    }
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

            // Backend broadcasts presence:update with { userId, status: 'online'|'offline' }
            on("presence:update") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val userId = data.optString("userId", "")
                    val status = data.optString("status", "offline")
                    if (status == "online") {
                        _onlineUsers.value = _onlineUsers.value + userId
                        _events.tryEmit(SocketEvent.UserOnline(userId))
                    } else {
                        _onlineUsers.value = _onlineUsers.value - userId
                        _events.tryEmit(SocketEvent.UserOffline(userId))
                    }
                }
            }

            on("call:incoming") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val offerObj = data.optJSONObject("offer")
                    val offerSdp = offerObj?.optString("sdp")
                    _events.tryEmit(SocketEvent.IncomingCall(
                        callId = data.optString("callId", ""),
                        callerId = data.optString("callerId", ""),
                        callerName = data.optString("callerName", ""),
                        callType = data.optString("callType", "voice"),
                        chatId = data.optString("chatId", ""),
                        offer = offerSdp
                    ))
                }
            }

            on("call:answered") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val answerObj = data.optJSONObject("answer")
                    val answerSdp = answerObj?.optString("sdp")
                    _events.tryEmit(SocketEvent.CallAnswered(
                        callId = data.optString("callId", ""),
                        chatId = data.optString("chatId", ""),
                        answer = answerSdp
                    ))
                }
            }

            on("call:rejected") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.CallRejected(
                        callId = data.optString("callId", ""),
                        chatId = data.optString("chatId", ""),
                        reason = data.optString("reason", "")
                    ))
                }
            }

            on("call:ended") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.CallEnded(
                        callId = data.optString("callId", ""),
                        chatId = data.optString("chatId", ""),
                        duration = data.optInt("duration", 0)
                    ))
                }
            }

            on("call:ice-candidate") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val candidateObj = data.optJSONObject("candidate")
                    if (candidateObj != null) {
                        _events.tryEmit(SocketEvent.IceCandidateReceived(
                            callId = data.optString("callId", ""),
                            candidateSdp = candidateObj.optString("candidate", ""),
                            sdpMid = candidateObj.optString("sdpMid", ""),
                            sdpMLineIndex = candidateObj.optInt("sdpMLineIndex", 0)
                        ))
                    }
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

            on("friend:request") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.FriendRequest(
                        friendshipId = data.optString("friendshipId", ""),
                        requesterId = data.optString("requesterId", "")
                    ))
                }
            }

            on("friend:accepted") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.FriendAccepted(
                        friendshipId = data.optString("friendshipId", ""),
                        acceptedBy = data.optString("acceptedBy", "")
                    ))
                }
            }

            // When the sender's own message is confirmed saved by the server
            on("message:sent") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    _events.tryEmit(SocketEvent.MessageSent(
                        tempId = data.optString("tempId", ""),
                        messageId = data.optString("messageId", ""),
                        timestamp = data.optString("timestamp", "")
                    ))
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

    fun initiateCall(chatId: String, targetUserId: String, callType: String, offer: org.webrtc.SessionDescription? = null) {
        val data = JSONObject().apply {
            put("chatId", chatId)
            put("targetUserId", targetUserId)
            put("callType", callType)
            offer?.let {
                put("offer", JSONObject().apply {
                    put("type", it.type.canonicalForm())
                    put("sdp", it.description)
                })
            }
        }
        socket?.emit("call:initiate", data, io.socket.client.Ack { ackArgs ->
            if (ackArgs.isNotEmpty()) {
                try {
                    val response = ackArgs[0] as JSONObject
                    val success = response.optBoolean("success", false)
                    val callId = response.optString("callId", "")
                    if (success && callId.isNotEmpty()) {
                        Log.d(tag, "Call initiated, callId: $callId")
                        _callIdCallback?.invoke(callId)
                    } else {
                        Log.e(tag, "Call initiate failed: ${response.optString("error", "unknown")}")
                    }
                } catch (e: Exception) {
                    Log.e(tag, "Error parsing call:initiate response", e)
                }
            }
        })
    }

    private var _callIdCallback: ((String) -> Unit)? = null

    fun setCallIdCallback(callback: ((String) -> Unit)?) {
        _callIdCallback = callback
    }

    fun answerCall(callId: String, targetUserId: String, answer: org.webrtc.SessionDescription? = null) {
        val data = JSONObject().apply {
            put("callId", callId)
            put("targetUserId", targetUserId)
            answer?.let {
                put("answer", JSONObject().apply {
                    put("type", it.type.canonicalForm())
                    put("sdp", it.description)
                })
            }
        }
        socket?.emit("call:answer", data)
    }

    fun rejectCall(callId: String, targetUserId: String) {
        val data = JSONObject().apply {
            put("callId", callId)
            put("targetUserId", targetUserId)
            put("reason", "Call rejected")
        }
        socket?.emit("call:reject", data)
    }

    fun endCall(callId: String, targetUserId: String) {
        val data = JSONObject().apply {
            put("callId", callId)
            put("targetUserId", targetUserId)
        }
        socket?.emit("call:end", data)
    }

    fun sendIceCandidate(callId: String, targetUserId: String, candidate: org.webrtc.IceCandidate) {
        val data = JSONObject().apply {
            put("callId", callId)
            put("targetUserId", targetUserId)
            put("candidate", JSONObject().apply {
                put("candidate", candidate.sdp)
                put("sdpMid", candidate.sdpMid)
                put("sdpMLineIndex", candidate.sdpMLineIndex)
            })
        }
        socket?.emit("call:ice-candidate", data)
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
