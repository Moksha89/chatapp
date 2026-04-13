package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class CreateContactRequest(
    @SerializedName("phoneNumber") val phoneNumber: String,
    @SerializedName("displayName") val displayName: String
)

data class UpdateContactRequest(
    @SerializedName("displayName") val displayName: String? = null,
    @SerializedName("phoneNumber") val phoneNumber: String? = null
)

data class InviteByPhoneRequest(
    @SerializedName("phoneNumber") val phoneNumber: String
)

data class InviteSentResponse(
    @SerializedName("sent") val sent: Boolean,
    @SerializedName("message") val message: String? = null
)

data class InviteLinkWithQrResponse(
    @SerializedName("inviteLink") val inviteLink: String,
    @SerializedName("qrCode") val qrCode: String? = null
)

data class GoogleDriveAuthResponse(
    @SerializedName("authUrl") val authUrl: String
)
