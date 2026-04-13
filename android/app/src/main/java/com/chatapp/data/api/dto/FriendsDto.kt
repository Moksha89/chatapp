package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class FriendResponse(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("friendId") val friendId: String,
    @SerializedName("user") val user: UserResponse? = null,
    @SerializedName("friend") val friend: UserResponse? = null,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class FriendRequestResponse(
    @SerializedName("id") val id: String,
    @SerializedName("senderId") val senderId: String,
    @SerializedName("receiverId") val receiverId: String,
    @SerializedName("sender") val sender: UserResponse? = null,
    @SerializedName("receiver") val receiver: UserResponse? = null,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class FriendRequestBody(
    @SerializedName("userId") val userId: String
)

data class FriendRequestStatusResponse(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String
)
