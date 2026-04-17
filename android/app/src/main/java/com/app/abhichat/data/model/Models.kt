package com.app.abhichat.data.model

import com.google.gson.annotations.SerializedName

// Auth
data class SendOtpRequest(val phone: String)
data class VerifyOtpRequest(val phone: String, val otp: String)
data class RegisterRequest(val phone: String, val otp: String, val displayName: String)
data class RefreshRequest(val refreshToken: String)
data class OtpResponse(val message: String)
data class AuthResponse(
    val token: String,
    val refreshToken: String,
    val user: User
)
data class TokenResponse(val token: String)

// User
data class User(
    val id: String,
    val phone: String,
    val displayName: String? = null,
    val profilePhoto: String? = null,
    val about: String? = null,
    val isOnline: Boolean = false,
    val lastSeen: String? = null,
    val isNewUser: Boolean = false
)

data class UpdateProfileRequest(
    val displayName: String? = null,
    val about: String? = null,
    val profilePhoto: String? = null
)

// Chat
data class Chat(
    val id: String,
    val type: String = "DIRECT",
    val title: String? = null,
    val members: List<ChatMember>? = null,
    val participants: List<User>? = null,
    val lastMessage: LastMessage? = null,
    val unreadCount: Int? = 0,
    val updatedAt: String? = null
)

data class ChatMember(
    val id: String,
    val userId: String,
    val role: String = "MEMBER",
    val user: User? = null
)

data class LastMessage(
    val id: String,
    val content: String? = null,
    val text: String? = null,
    val type: String = "TEXT",
    val senderId: String? = null,
    val senderName: String? = null,
    val createdAt: String? = null,
    val status: String? = null
)

data class CreateDirectChatRequest(val otherUserId: String)

// Message
data class Message(
    val id: String,
    val chatId: String,
    val senderId: String,
    val content: String? = null,
    val text: String? = null,
    val type: String = "TEXT",
    val status: String = "SENT",
    val createdAt: String? = null,
    val sender: User? = null,
    val attachments: List<Attachment>? = null
)

data class Attachment(
    val id: String,
    val fileUrl: String,
    val fileType: String? = null,
    val size: Long? = null
)

// Call
data class InitiateCallRequest(val chatId: String, val type: String)
data class CallResponse(val id: String, val status: String)
data class LiveKitTokenRequest(val roomName: String)
data class RegisterDeviceRequest(val fcmToken: String, val platform: String = "ANDROID")
