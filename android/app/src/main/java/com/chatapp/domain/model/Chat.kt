package com.chatapp.domain.model

data class Chat(
    val id: String,
    val type: ChatType,
    val name: String? = null,
    val participants: List<ChatParticipant>,
    val lastMessage: Message? = null,
    val unreadCount: Int = 0,
    val createdAt: Long,
    val updatedAt: Long
)

enum class ChatType {
    DIRECT,
    GROUP,
    CHANNEL,
    COMMUNITY
}

data class ChatParticipant(
    val id: String,
    val chatId: String,
    val userId: String,
    val user: User? = null,
    val role: ParticipantRole,
    val joinedAt: Long
)

enum class ParticipantRole {
    ADMIN,
    MEMBER
}
