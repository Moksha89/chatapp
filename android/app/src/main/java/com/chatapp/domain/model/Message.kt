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
    val tempId: String? = null,
    val replyToMessageId: String? = null,
    val reactions: Map<String, List<String>> = emptyMap(),
    val isEdited: Boolean = false,
    val isDeleted: Boolean = false,
    val editedAt: Long? = null
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
