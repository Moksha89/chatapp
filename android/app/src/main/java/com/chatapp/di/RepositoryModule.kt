package com.chatapp.di

import com.chatapp.data.api.ApiService
import com.chatapp.data.repository.ChatRepositoryImpl
import com.chatapp.data.repository.PrivacyRepositoryImpl
import com.chatapp.domain.repository.ChatRepository
import com.chatapp.domain.repository.PrivacyRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideChatRepository(apiService: ApiService): ChatRepository {
        return ChatRepositoryImpl(apiService)
    }

    @Provides
    @Singleton
    fun providePrivacyRepository(apiService: ApiService): PrivacyRepository {
        return PrivacyRepositoryImpl(apiService)
    }
}
