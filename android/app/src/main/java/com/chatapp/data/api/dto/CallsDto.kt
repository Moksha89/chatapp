package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class CallHistoryResponse(
    @SerializedName("id") val id: String,
    @SerializedName("callerId") val callerId: String,
    @SerializedName("receiverId") val receiverId: String? = null,
    @SerializedName("caller") val caller: UserResponse? = null,
    @SerializedName("receiver") val receiver: UserResponse? = null,
    @SerializedName("type") val type: String,
    @SerializedName("status") val status: String,
    @SerializedName("duration") val duration: Int? = null,
    @SerializedName("startedAt") val startedAt: String? = null,
    @SerializedName("endedAt") val endedAt: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class InitiateCallRequest(
    @SerializedName("receiverId") val receiverId: String,
    @SerializedName("type") val type: String = "voice"
)

data class CallStatusResponse(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String
)

data class EndCallResponse(
    @SerializedName("id") val id: String,
    @SerializedName("duration") val duration: Int? = null,
    @SerializedName("status") val status: String = "ended"
)
