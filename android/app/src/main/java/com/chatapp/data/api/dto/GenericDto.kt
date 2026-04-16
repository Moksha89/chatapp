package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class GenericIdResponse(
    @SerializedName("id") val id: String
)

data class GenericMessageResponse(
    @SerializedName("message") val message: String
)

data class GenericSuccessResponse(
    @SerializedName("success") val success: Boolean
)

data class ReportUserRequest(
    @SerializedName("reason") val reason: String,
    @SerializedName("details") val details: String? = null
)

data class ReportUserResponse(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String
)
