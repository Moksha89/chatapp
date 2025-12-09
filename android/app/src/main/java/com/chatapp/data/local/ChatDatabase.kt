package com.chatapp.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.chatapp.data.local.dao.PendingMessageDao
import com.chatapp.data.local.entity.PendingMessageEntity

@Database(
    entities = [PendingMessageEntity::class],
    version = 1,
    exportSchema = false
)
abstract class ChatDatabase : RoomDatabase() {
    abstract fun pendingMessageDao(): PendingMessageDao
}
