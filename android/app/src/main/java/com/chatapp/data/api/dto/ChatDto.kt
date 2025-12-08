package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class UserResponse(
    @SerializedName("id") val id: String,
    @SerializedName("phoneNumber") val phoneNumber: String,
    @SerializedName("displayName") val displayName: String,
    @SerializedName("profilePhoto") val profilePhoto: String? = null,
    @SerializedName("status") val status: String? = null,
    @SerializedName("isBusiness") val isBusiness: Boolean = false
)

data class UpdateProfileRequest(
    @SerializedName("displayName") val displayName: String? = null,
    @SerializedName("profilePhoto") val profilePhoto: String? = null,
    @SerializedName("status") val status: String? = null
)

data class ChatResponse(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String,
    @SerializedName("name") val name: String? = null,
    @SerializedName("participants") val participants: List<ParticipantResponse>,
    @SerializedName("lastMessage") val lastMessage: MessageResponse? = null,
    @SerializedName("unreadCount") val unreadCount: Int = 0
)

data class ParticipantResponse(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("user") val user: UserResponse? = null
)

data class CreateChatRequest(
    @SerializedName("type") val type: String = "direct",
    @SerializedName("participantId") val participantId: String
)

data class MessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("chatId") val chatId: String,
    @SerializedName("senderId") val senderId: String,
    @SerializedName("content") val content: String? = null,
    @SerializedName("type") val type: String,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("replyToMessageId") val replyToMessageId: String? = null,
    @SerializedName("reactions") val reactions: Map<String, List<String>>? = null,
    @SerializedName("isEdited") val isEdited: Boolean = false,
    @SerializedName("isDeleted") val isDeleted: Boolean = false,
    @SerializedName("editedAt") val editedAt: String? = null
)

data class SendMessageRequest(
    @SerializedName("content") val content: String,
    @SerializedName("type") val type: String = "text",
    @SerializedName("tempId") val tempId: String? = null
)

data class MarkReadRequest(
    @SerializedName("messageIds") val messageIds: List<String>
)

data class SearchUsersRequest(
    @SerializedName("phoneNumber") val phoneNumber: String
)

// Reaction DTOs
data class AddReactionRequest(
    @SerializedName("emoji") val emoji: String
)

data class ReactionResponse(
    @SerializedName("id") val id: String,
    @SerializedName("reactions") val reactions: Map<String, List<String>>
)

// Edit Message DTOs
data class EditMessageRequest(
    @SerializedName("content") val content: String
)

data class EditMessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("content") val content: String,
    @SerializedName("isEdited") val isEdited: Boolean,
    @SerializedName("editedAt") val editedAt: String
)

// Delete Message Response
data class DeleteMessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("isDeleted") val isDeleted: Boolean
)

// Privacy Settings DTOs
data class PrivacySettingsResponse(
    @SerializedName("readReceiptsEnabled") val readReceiptsEnabled: Boolean,
    @SerializedName("blockedUsers") val blockedUsers: List<String>
)

data class UpdatePrivacySettingsRequest(
    @SerializedName("readReceiptsEnabled") val readReceiptsEnabled: Boolean? = null
)

data class BlockUserRequest(
    @SerializedName("userId") val userId: String
)
