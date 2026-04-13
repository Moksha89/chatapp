package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class NotificationSettingsResponse(
    @SerializedName("messageNotifications") val messageNotifications: Boolean = true,
    @SerializedName("groupNotifications") val groupNotifications: Boolean = true,
    @SerializedName("callNotifications") val callNotifications: Boolean = true,
    @SerializedName("soundEnabled") val soundEnabled: Boolean = true,
    @SerializedName("vibrationEnabled") val vibrationEnabled: Boolean = true
)

data class UpdateNotificationSettingsRequest(
    @SerializedName("messageNotifications") val messageNotifications: Boolean? = null,
    @SerializedName("groupNotifications") val groupNotifications: Boolean? = null,
    @SerializedName("callNotifications") val callNotifications: Boolean? = null,
    @SerializedName("soundEnabled") val soundEnabled: Boolean? = null,
    @SerializedName("vibrationEnabled") val vibrationEnabled: Boolean? = null
)

data class StorageUsageResponse(
    @SerializedName("totalSize") val totalSize: Long = 0,
    @SerializedName("chats") val chats: List<ChatStorageResponse> = emptyList()
)

data class ChatStorageResponse(
    @SerializedName("chatId") val chatId: String,
    @SerializedName("chatName") val chatName: String? = null,
    @SerializedName("size") val size: Long = 0,
    @SerializedName("mediaCount") val mediaCount: Int = 0
)

data class ClearStorageResponse(
    @SerializedName("chatId") val chatId: String,
    @SerializedName("cleared") val cleared: Boolean = true,
    @SerializedName("freedSpace") val freedSpace: Long = 0
)

data class ThemeSettingsResponse(
    @SerializedName("theme") val theme: String = "system",
    @SerializedName("chatWallpaper") val chatWallpaper: String? = null,
    @SerializedName("fontSize") val fontSize: String = "medium",
    @SerializedName("bubbleColor") val bubbleColor: String? = null
)

data class UpdateThemeSettingsRequest(
    @SerializedName("theme") val theme: String? = null,
    @SerializedName("chatWallpaper") val chatWallpaper: String? = null,
    @SerializedName("fontSize") val fontSize: String? = null,
    @SerializedName("bubbleColor") val bubbleColor: String? = null
)

data class AppVersionResponse(
    @SerializedName("version") val version: String,
    @SerializedName("buildNumber") val buildNumber: Int = 0
)

data class CreateBackupRequest(
    @SerializedName("includeMedia") val includeMedia: Boolean = false,
    @SerializedName("destination") val destination: String = "local"
)

data class CreateBackupResponse(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String,
    @SerializedName("size") val size: Long? = null
)

data class BackupHistoryResponse(
    @SerializedName("id") val id: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("size") val size: Long = 0,
    @SerializedName("status") val status: String
)
