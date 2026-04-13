package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class StatusResponse(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("user") val user: UserResponse? = null,
    @SerializedName("type") val type: String,
    @SerializedName("content") val content: String? = null,
    @SerializedName("mediaUrl") val mediaUrl: String? = null,
    @SerializedName("backgroundColor") val backgroundColor: String? = null,
    @SerializedName("viewCount") val viewCount: Int = 0,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("expiresAt") val expiresAt: String? = null
)

data class CreateStatusRequest(
    @SerializedName("type") val type: String,
    @SerializedName("content") val content: String? = null,
    @SerializedName("mediaUrl") val mediaUrl: String? = null,
    @SerializedName("backgroundColor") val backgroundColor: String? = null,
    @SerializedName("duration") val duration: Int = 86400
)
