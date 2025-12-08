package com.chatapp.domain.repository

import com.chatapp.domain.model.Chat
import com.chatapp.domain.model.Message
import kotlinx.coroutines.flow.Flow

interface ChatRepository {
    fun getChats(): Flow<List<Chat>>
    suspend fun refreshChats(): Result<List<Chat>>
    suspend fun createChat(participantId: String): Result<Chat>
    suspend fun getMessages(chatId: String, limit: Int = 50, before: String? = null): Result<List<Message>>
    suspend fun sendMessage(chatId: String, content: String, tempId: String): Result<Message>
    suspend fun markMessagesRead(chatId: String, messageIds: List<String>): Result<Unit>
}
