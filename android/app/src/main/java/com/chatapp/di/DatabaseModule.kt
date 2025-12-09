package com.chatapp.di

import android.content.Context
import androidx.room.Room
import com.chatapp.data.local.ChatDatabase
import com.chatapp.data.local.dao.PendingMessageDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideChatDatabase(@ApplicationContext context: Context): ChatDatabase {
        return Room.databaseBuilder(
            context,
            ChatDatabase::class.java,
            "chatapp_database"
        ).build()
    }

    @Provides
    @Singleton
    fun providePendingMessageDao(database: ChatDatabase): PendingMessageDao {
        return database.pendingMessageDao()
    }
}
