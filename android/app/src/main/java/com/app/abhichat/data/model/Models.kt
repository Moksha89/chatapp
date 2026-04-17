package com.app.abhichat.data.model

import com.google.gson.annotations.SerializedName

data class User(
    val id: String,
    val phone: String,
    val displayName: String?,
    val profilePhoto: String?,
    val isOnline: Boolean = false,
    val lastSeen: String? = null
)

data class SendOtpRequest(val phone: String)
data class SendOtpResponse(val message: String)

data class VerifyOtpRequest(
    val phone: String,
    val code: String,
    val deviceId: String,
    val fcmToken: String? = null,
    val platform: String = "android"
)

data class VerifyOtpResponse(
    val accessToken: String,
    val user: User,
    val isNewUser: Boolean
)

data class QrGenerateResponse(
    val token: String,
    val expiresAt: String
)

data class QrScanRequest(val token: String)
data class QrScanResponse(val success: Boolean)

data class CreateChatRequest(val otherUserId: String)
data class CreateChatResponse(val chatId: String)

data class ChatItem(
    val id: String,
    val otherUser: User?,
    val lastMessage: LastMessage?,
    val unreadCount: Int = 0
)

data class LastMessage(
    val content: String,
    val senderId: String,
    val createdAt: String,
    val type: String
)

data class Message(
    val id: String,
    val chatId: String,
    val senderId: String,
    val content: String,
    val type: String = "text",
    val createdAt: String,
    @SerializedName("read") val isRead: Boolean = false
)

data class UpdateProfileRequest(
    val displayName: String? = null,
    val profilePhoto: String? = null
)

data class CallInitiate(
    val targetUserId: String,
    val callType: String,
    val peerId: String
)

data class CallIncoming(
    val callerId: String,
    val callerName: String,
    val callType: String,
    val peerId: String
)
