package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class CountryStatResponse(
    @SerializedName("country") val country: String,
    @SerializedName("userCount") val userCount: Int,
    @SerializedName("activeCount") val activeCount: Int = 0
)

data class PendingApprovalsResponse(
    @SerializedName("approvals") val approvals: List<PendingApprovalItem>,
    @SerializedName("total") val total: Int = 0,
    @SerializedName("page") val page: Int = 1
)

data class PendingApprovalItem(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("user") val user: UserResponse? = null,
    @SerializedName("requestedAt") val requestedAt: String? = null
)

data class AdminCreateUserRequest(
    @SerializedName("phoneNumber") val phoneNumber: String,
    @SerializedName("displayName") val displayName: String,
    @SerializedName("isBusiness") val isBusiness: Boolean = false,
    @SerializedName("role") val role: String = "user"
)

data class GlobalStatusRequest(
    @SerializedName("content") val content: String,
    @SerializedName("type") val type: String = "text"
)

data class StickerResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("imageUrl") val imageUrl: String,
    @SerializedName("pack") val pack: String? = null
)
