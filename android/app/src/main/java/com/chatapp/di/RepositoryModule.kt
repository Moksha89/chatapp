package com.chatapp.di

import android.content.Context
import com.chatapp.data.api.ApiService
import com.chatapp.data.local.MessageQueueManager
import com.chatapp.data.repository.AuthRepositoryImpl
import com.chatapp.data.repository.ChatRepositoryImpl
import com.chatapp.data.repository.PrivacyRepositoryImpl
import com.chatapp.domain.repository.AuthRepository
import com.chatapp.domain.repository.ChatRepository
import com.chatapp.domain.repository.PrivacyRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideAuthRepository(
        apiService: ApiService,
        @ApplicationContext context: Context
    ): AuthRepositoryImpl {
        return AuthRepositoryImpl(apiService, context)
    }

    @Provides
    @Singleton
    fun provideChatRepository(
        apiService: ApiService,
        messageQueueManager: MessageQueueManager
    ): ChatRepository {
        return ChatRepositoryImpl(apiService, messageQueueManager)
    }

    @Provides
    @Singleton
    fun providePrivacyRepository(apiService: ApiService): PrivacyRepository {
        return PrivacyRepositoryImpl(apiService)
    }
}
