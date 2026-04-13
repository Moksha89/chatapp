package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class SetWallpaperRequest(
    @SerializedName("wallpaperUrl") val wallpaperUrl: String? = null,
    @SerializedName("color") val color: String? = null
)

data class SetWallpaperResponse(
    @SerializedName("id") val id: String,
    @SerializedName("wallpaper") val wallpaper: String? = null
)

data class ChatLockResponse(
    @SerializedName("id") val id: String,
    @SerializedName("isLocked") val isLocked: Boolean
)

data class DisappearingMessagesRequest(
    @SerializedName("duration") val duration: Int
)

data class DisappearingMessagesResponse(
    @SerializedName("id") val id: String,
    @SerializedName("disappearingDuration") val disappearingDuration: Int
)

data class PinConversationRequest(
    @SerializedName("pinned") val pinned: Boolean
)

data class PinConversationResponse(
    @SerializedName("id") val id: String,
    @SerializedName("isPinned") val isPinned: Boolean
)

data class MuteConversationRequest(
    @SerializedName("muted") val muted: Boolean,
    @SerializedName("muteUntil") val muteUntil: String? = null
)

data class MuteConversationResponse(
    @SerializedName("id") val id: String,
    @SerializedName("isMuted") val isMuted: Boolean
)

data class ArchiveConversationRequest(
    @SerializedName("archived") val archived: Boolean
)

data class ArchiveConversationResponse(
    @SerializedName("id") val id: String,
    @SerializedName("isArchived") val isArchived: Boolean
)

data class FavoriteConversationRequest(
    @SerializedName("favorite") val favorite: Boolean
)

data class FavoriteConversationResponse(
    @SerializedName("id") val id: String,
    @SerializedName("isFavorite") val isFavorite: Boolean
)

data class ClearChatResponse(
    @SerializedName("id") val id: String,
    @SerializedName("cleared") val cleared: Boolean = true
)

data class ReportContactRequest(
    @SerializedName("reason") val reason: String,
    @SerializedName("details") val details: String? = null
)

data class StarMessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("isStarred") val isStarred: Boolean
)

data class ForwardMessageRequest(
    @SerializedName("targetChatIds") val targetChatIds: List<String>
)

data class ForwardMessageResponse(
    @SerializedName("forwardedCount") val forwardedCount: Int
)

data class SeenByResponse(
    @SerializedName("userId") val userId: String,
    @SerializedName("seenAt") val seenAt: String
)

data class VotePollRequest(
    @SerializedName("optionIndex") val optionIndex: Int
)

data class VotePollResponse(
    @SerializedName("id") val id: String,
    @SerializedName("votes") val votes: Map<String, Int>? = null
)

data class ViewOnceResponse(
    @SerializedName("id") val id: String,
    @SerializedName("viewed") val viewed: Boolean = true
)

data class ChatBackupContentResponse(
    @SerializedName("data") val data: String,
    @SerializedName("format") val format: String
)

data class ChatbotConfigRequest(
    @SerializedName("enabled") val enabled: Boolean,
    @SerializedName("name") val name: String? = null,
    @SerializedName("prompt") val prompt: String? = null
)

data class ChatbotConfigResponse(
    @SerializedName("id") val id: String? = null,
    @SerializedName("enabled") val enabled: Boolean = false,
    @SerializedName("name") val name: String? = null,
    @SerializedName("prompt") val prompt: String? = null
)

data class FlowResponseRequest(
    @SerializedName("responses") val responses: Map<String, String>
)

data class ToggleProductResponse(
    @SerializedName("id") val id: String,
    @SerializedName("inStock") val inStock: Boolean
)

data class AssignLabelsRequest(
    @SerializedName("labelIds") val labelIds: List<String>
)

data class ChatLabelResponse(
    @SerializedName("chatId") val chatId: String,
    @SerializedName("labelId") val labelId: String
)

data class ToggleAutoReplyResponse(
    @SerializedName("id") val id: String,
    @SerializedName("isActive") val isActive: Boolean
)

data class BroadcastAnalyticsResponse(
    @SerializedName("id") val id: String,
    @SerializedName("sentCount") val sentCount: Int = 0,
    @SerializedName("deliveredCount") val deliveredCount: Int = 0,
    @SerializedName("readCount") val readCount: Int = 0
)
