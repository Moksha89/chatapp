package com.chatapp.domain.repository

import com.chatapp.domain.model.Chat
import com.chatapp.domain.model.Message
import kotlinx.coroutines.flow.Flow

interface ChatRepository {
    fun getChats(): Flow<List<Chat>>
    suspend fun refreshChats(): Result<List<Chat>>
    suspend fun createChat(participantId: String): Result<Chat>
    suspend fun getMessages(chatId: String, limit: Int = 50, before: String? = null): Result<List<Message>>
    suspend fun sendMessage(chatId: String, content: String, tempId: String, replyToMessageId: String? = null): Result<Message>
    suspend fun markMessagesRead(chatId: String, messageIds: List<String>): Result<Unit>
    
    // Reactions
    suspend fun addReaction(chatId: String, messageId: String, emoji: String): Result<Map<String, List<String>>>
    suspend fun removeReaction(chatId: String, messageId: String, emoji: String): Result<Map<String, List<String>>>
    
    // Edit/Delete
    suspend fun editMessage(chatId: String, messageId: String, content: String): Result<Message>
    suspend fun deleteMessage(chatId: String, messageId: String, deleteForEveryone: Boolean): Result<Unit>
}
