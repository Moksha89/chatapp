package com.chatapp.data.local.dao

import androidx.room.*
import com.chatapp.data.local.entity.PendingMessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingMessageDao {
    @Query("SELECT * FROM pending_messages ORDER BY createdAt ASC")
    fun getAllPendingMessages(): Flow<List<PendingMessageEntity>>

    @Query("SELECT * FROM pending_messages WHERE chatId = :chatId ORDER BY createdAt ASC")
    fun getPendingMessagesForChat(chatId: String): Flow<List<PendingMessageEntity>>

    @Query("SELECT * FROM pending_messages WHERE status = 'pending' OR status = 'failed' ORDER BY createdAt ASC")
    suspend fun getMessagesToRetry(): List<PendingMessageEntity>

    @Query("SELECT * FROM pending_messages WHERE tempId = :tempId")
    suspend fun getByTempId(tempId: String): PendingMessageEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: PendingMessageEntity)

    @Update
    suspend fun update(message: PendingMessageEntity)

    @Delete
    suspend fun delete(message: PendingMessageEntity)

    @Query("DELETE FROM pending_messages WHERE tempId = :tempId")
    suspend fun deleteByTempId(tempId: String)

    @Query("UPDATE pending_messages SET status = :status, retryCount = retryCount + 1, lastRetryAt = :lastRetryAt WHERE tempId = :tempId")
    suspend fun updateRetryStatus(tempId: String, status: String, lastRetryAt: Long)

    @Query("SELECT COUNT(*) FROM pending_messages WHERE chatId = :chatId")
    suspend fun getPendingCountForChat(chatId: String): Int
}
