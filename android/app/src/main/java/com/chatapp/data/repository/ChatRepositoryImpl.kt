package com.chatapp.data.repository

import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.*
import com.chatapp.domain.model.*
import com.chatapp.domain.repository.ChatRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : ChatRepository {

    private val _chats = MutableStateFlow<List<Chat>>(emptyList())
    
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    override fun getChats(): Flow<List<Chat>> = _chats.asStateFlow()

    override suspend fun refreshChats(): Result<List<Chat>> {
        return try {
            val response = apiService.getChats()
            val chats = response.map { it.toDomain() }
            _chats.value = chats
            Result.success(chats)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createChat(participantId: String): Result<Chat> {
        return try {
            val response = apiService.createChat(CreateChatRequest(participantId = participantId))
            Result.success(response.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getMessages(chatId: String, limit: Int, before: String?): Result<List<Message>> {
        return try {
            val response = apiService.getMessages(chatId, limit, before)
            val messages = response.map { it.toDomain() }
            Result.success(messages)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun sendMessage(chatId: String, content: String, tempId: String): Result<Message> {
        return try {
            val response = apiService.sendMessage(chatId, SendMessageRequest(content = content, tempId = tempId))
            Result.success(response.toDomain())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun markMessagesRead(chatId: String, messageIds: List<String>): Result<Unit> {
        return try {
            apiService.markMessagesRead(chatId, MarkReadRequest(messageIds))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun addReaction(chatId: String, messageId: String, emoji: String): Result<Map<String, List<String>>> {
        return try {
            val response = apiService.addReaction(chatId, messageId, AddReactionRequest(emoji))
            Result.success(response.reactions)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun removeReaction(chatId: String, messageId: String, emoji: String): Result<Map<String, List<String>>> {
        return try {
            val response = apiService.removeReaction(chatId, messageId, AddReactionRequest(emoji))
            Result.success(response.reactions)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun editMessage(chatId: String, messageId: String, content: String): Result<Message> {
        return try {
            val response = apiService.editMessage(chatId, messageId, EditMessageRequest(content))
            // Return a partial message with the updated content
            Result.success(Message(
                id = response.id,
                chatId = chatId,
                senderId = "",
                content = response.content,
                type = MessageType.TEXT,
                status = MessageStatus.SENT,
                createdAt = System.currentTimeMillis(),
                isEdited = response.isEdited,
                editedAt = parseDate(response.editedAt)
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun deleteMessage(chatId: String, messageId: String, deleteForEveryone: Boolean): Result<Unit> {
        return try {
            apiService.deleteMessage(chatId, messageId, deleteForEveryone)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun ChatResponse.toDomain(): Chat {
        return Chat(
            id = id,
            type = if (type == "group") ChatType.GROUP else ChatType.DIRECT,
            name = name,
            participants = participants.map { it.toDomain(id) },
            lastMessage = lastMessage?.toDomain(),
            unreadCount = unreadCount,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
    }

    private fun ParticipantResponse.toDomain(chatId: String): ChatParticipant {
        return ChatParticipant(
            id = id,
            chatId = chatId,
            userId = userId,
            user = user?.toDomain(),
            role = ParticipantRole.MEMBER,
            joinedAt = System.currentTimeMillis()
        )
    }

    private fun UserResponse.toDomain(): User {
        return User(
            id = id,
            phoneNumber = phoneNumber,
            displayName = displayName,
            profilePhoto = profilePhoto,
            status = status,
            isBusiness = isBusiness
        )
    }

    private fun MessageResponse.toDomain(): Message {
        return Message(
            id = id,
            chatId = chatId,
            senderId = senderId,
            content = content,
            type = when (type.lowercase()) {
                "image" -> MessageType.IMAGE
                "file" -> MessageType.FILE
                "audio" -> MessageType.AUDIO
                else -> MessageType.TEXT
            },
            status = when (status.lowercase()) {
                "delivered" -> MessageStatus.DELIVERED
                "read" -> MessageStatus.READ
                "sending" -> MessageStatus.SENDING
                else -> MessageStatus.SENT
            },
            createdAt = parseDate(createdAt) ?: System.currentTimeMillis(),
            replyToMessageId = replyToMessageId,
            reactions = reactions ?: emptyMap(),
            isEdited = isEdited,
            isDeleted = isDeleted,
            editedAt = editedAt?.let { parseDate(it) }
        )
    }

    private fun parseDate(dateString: String?): Long? {
        if (dateString == null) return null
        return try {
            dateFormat.parse(dateString)?.time
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }
}
