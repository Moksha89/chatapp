package com.chatapp.data.local

import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.SendMessageRequest
import com.chatapp.data.local.dao.PendingMessageDao
import com.chatapp.data.local.entity.PendingMessageEntity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MessageQueueManager @Inject constructor(
    private val pendingMessageDao: PendingMessageDao,
    private val apiService: ApiService
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var retryJob: Job? = null
    
    companion object {
        private const val MAX_RETRY_COUNT = 5
        private const val BASE_RETRY_DELAY_MS = 1000L // 1 second
        private const val MAX_RETRY_DELAY_MS = 60000L // 1 minute
    }

    fun getPendingMessagesForChat(chatId: String): Flow<List<PendingMessageEntity>> {
        return pendingMessageDao.getPendingMessagesForChat(chatId)
    }

    suspend fun queueMessage(chatId: String, content: String, tempId: String, replyToMessageId: String? = null) {
        val pendingMessage = PendingMessageEntity(
            tempId = tempId,
            chatId = chatId,
            content = content,
            createdAt = System.currentTimeMillis(),
            status = "pending",
            replyToMessageId = replyToMessageId
        )
        pendingMessageDao.insert(pendingMessage)
        
        // Try to send immediately
        trySendMessage(pendingMessage)
    }

    private suspend fun trySendMessage(message: PendingMessageEntity) {
        try {
            // Update status to sending
            pendingMessageDao.updateRetryStatus(message.tempId, "sending", System.currentTimeMillis())
            
            // Attempt to send via API
            val response = apiService.sendMessage(
                message.chatId,
                SendMessageRequest(
                    content = message.content, 
                    tempId = message.tempId,
                    replyToMessageId = message.replyToMessageId
                )
            )
            
            // Success - remove from queue
            pendingMessageDao.deleteByTempId(message.tempId)
            
        } catch (e: Exception) {
            // Failed - mark for retry
            val newRetryCount = message.retryCount + 1
            if (newRetryCount >= MAX_RETRY_COUNT) {
                pendingMessageDao.updateRetryStatus(message.tempId, "failed", System.currentTimeMillis())
            } else {
                pendingMessageDao.updateRetryStatus(message.tempId, "pending", System.currentTimeMillis())
            }
        }
    }

    fun startRetryLoop() {
        retryJob?.cancel()
        retryJob = scope.launch {
            while (isActive) {
                retryPendingMessages()
                delay(5000) // Check every 5 seconds
            }
        }
    }

    fun stopRetryLoop() {
        retryJob?.cancel()
        retryJob = null
    }

    private suspend fun retryPendingMessages() {
        val messagesToRetry = pendingMessageDao.getMessagesToRetry()
        
        for (message in messagesToRetry) {
            // Calculate exponential backoff delay
            val delayMs = calculateBackoffDelay(message.retryCount)
            val timeSinceLastRetry = message.lastRetryAt?.let { 
                System.currentTimeMillis() - it 
            } ?: Long.MAX_VALUE
            
            // Only retry if enough time has passed
            if (timeSinceLastRetry >= delayMs) {
                trySendMessage(message)
            }
        }
    }

    private fun calculateBackoffDelay(retryCount: Int): Long {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 60s
        val delay = BASE_RETRY_DELAY_MS * (1L shl retryCount.coerceAtMost(6))
        return delay.coerceAtMost(MAX_RETRY_DELAY_MS)
    }

    suspend fun retryFailedMessage(tempId: String) {
        val message = pendingMessageDao.getByTempId(tempId)
        if (message != null && message.status == "failed") {
            // Reset retry count and try again
            val resetMessage = message.copy(retryCount = 0, status = "pending")
            pendingMessageDao.update(resetMessage)
            trySendMessage(resetMessage)
        }
    }

    suspend fun cancelPendingMessage(tempId: String) {
        pendingMessageDao.deleteByTempId(tempId)
    }
}
