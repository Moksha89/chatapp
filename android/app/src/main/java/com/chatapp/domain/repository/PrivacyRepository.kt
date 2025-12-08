package com.chatapp.domain.repository

data class PrivacySettings(
    val readReceiptsEnabled: Boolean,
    val blockedUsers: List<BlockedUserInfo>
)

data class BlockedUserInfo(
    val id: String,
    val displayName: String,
    val phoneNumber: String
)

interface PrivacyRepository {
    suspend fun getPrivacySettings(): Result<PrivacySettings>
    suspend fun updateReadReceipts(enabled: Boolean): Result<PrivacySettings>
    suspend fun blockUser(userId: String): Result<Unit>
    suspend fun unblockUser(userId: String): Result<Unit>
}
