package com.chatapp.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_messages")
data class PendingMessageEntity(
    @PrimaryKey
    val tempId: String,
    val chatId: String,
    val content: String,
    val type: String = "text",
    val createdAt: Long = System.currentTimeMillis(),
    val retryCount: Int = 0,
    val lastRetryAt: Long? = null,
    val status: String = "pending", // pending, sending, failed
    val replyToMessageId: String? = null
)
