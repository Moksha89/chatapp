package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class UpdateGroupInfoRequest(
    @SerializedName("name") val name: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("profilePhoto") val profilePhoto: String? = null
)

data class InviteLinkResponse(
    @SerializedName("inviteLink") val inviteLink: String
)

data class GroupPermissionsRequest(
    @SerializedName("onlyAdminsCanSend") val onlyAdminsCanSend: Boolean? = null,
    @SerializedName("onlyAdminsCanEditInfo") val onlyAdminsCanEditInfo: Boolean? = null,
    @SerializedName("onlyAdminsCanAddMembers") val onlyAdminsCanAddMembers: Boolean? = null
)

data class GroupPermissionsResponse(
    @SerializedName("onlyAdminsCanSend") val onlyAdminsCanSend: Boolean = false,
    @SerializedName("onlyAdminsCanEditInfo") val onlyAdminsCanEditInfo: Boolean = false,
    @SerializedName("onlyAdminsCanAddMembers") val onlyAdminsCanAddMembers: Boolean = false
)

data class CreateChannelRequest(
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String? = null
)

data class CreateCommunityRequest(
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String? = null,
    @SerializedName("channelIds") val channelIds: List<String> = emptyList()
)

data class PinMessageRequest(
    @SerializedName("messageId") val messageId: String
)

data class PinMessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("pinnedMessageId") val pinnedMessageId: String
)
