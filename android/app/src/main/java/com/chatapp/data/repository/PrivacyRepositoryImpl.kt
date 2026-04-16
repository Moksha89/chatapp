package com.chatapp.data.repository

import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.BlockUserRequest
import com.chatapp.data.api.dto.UpdatePrivacySettingsRequest
import com.chatapp.domain.repository.BlockedUserInfo
import com.chatapp.domain.repository.PrivacyRepository
import com.chatapp.domain.repository.PrivacySettings
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PrivacyRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : PrivacyRepository {

    override suspend fun getPrivacySettings(): Result<PrivacySettings> {
        return try {
            val response = apiService.getPrivacySettings()
            Result.success(PrivacySettings(
                readReceiptsEnabled = response.readReceiptsEnabled,
                blockedUsers = response.blockedUsers.map { userId ->
                    BlockedUserInfo(
                        id = userId,
                        displayName = "User $userId",
                        phoneNumber = ""
                    )
                }
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateReadReceipts(enabled: Boolean): Result<PrivacySettings> {
        return try {
            val response = apiService.updatePrivacySettings(
                UpdatePrivacySettingsRequest(readReceiptsEnabled = enabled)
            )
            Result.success(PrivacySettings(
                readReceiptsEnabled = response.readReceiptsEnabled,
                blockedUsers = response.blockedUsers.map { userId ->
                    BlockedUserInfo(
                        id = userId,
                        displayName = "User $userId",
                        phoneNumber = ""
                    )
                }
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun blockUser(userId: String): Result<Unit> {
        return try {
            apiService.blockUser(BlockUserRequest(userId))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun unblockUser(userId: String): Result<Unit> {
        return try {
            apiService.unblockUser(BlockUserRequest(userId))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
