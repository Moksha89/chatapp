package com.chatapp.domain.model

data class Message(
    val id: String,
    val chatId: String,
    val senderId: String,
    val senderDeviceId: String? = null,
    val content: String? = null,
    val ciphertext: String? = null,
    val type: MessageType,
    val status: MessageStatus,
    val createdAt: Long,
    val deliveredAt: Long? = null,
    val readAt: Long? = null,
    val tempId: String? = null
)

enum class MessageType {
    TEXT,
    IMAGE,
    FILE,
    AUDIO
}

enum class MessageStatus {
    SENDING,
    SENT,
    DELIVERED,
    READ
}
