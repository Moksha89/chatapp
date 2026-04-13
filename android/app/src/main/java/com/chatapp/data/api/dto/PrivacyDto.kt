package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class TwoStepEnableRequest(
    @SerializedName("pin") val pin: String,
    @SerializedName("email") val email: String? = null
)

data class TwoStepResponse(
    @SerializedName("enabled") val enabled: Boolean,
    @SerializedName("message") val message: String? = null
)

data class TwoStepVerifyRequest(
    @SerializedName("pin") val pin: String
)

data class TwoStepVerifyResponse(
    @SerializedName("verified") val verified: Boolean,
    @SerializedName("message") val message: String? = null
)

data class LastSeenPrivacyRequest(
    @SerializedName("lastSeenVisibility") val lastSeenVisibility: String
)

data class LastSeenPrivacyResponse(
    @SerializedName("lastSeenVisibility") val lastSeenVisibility: String
)

data class SafetyNumberResponse(
    @SerializedName("safetyNumber") val safetyNumber: String,
    @SerializedName("qrCode") val qrCode: String? = null
)

data class VerifySafetyNumberRequest(
    @SerializedName("safetyNumber") val safetyNumber: String
)

data class VerifySafetyNumberResponse(
    @SerializedName("verified") val verified: Boolean
)

data class CallPrivacyRequest(
    @SerializedName("callsAllowed") val callsAllowed: String
)

data class CallPrivacyResponse(
    @SerializedName("callsAllowed") val callsAllowed: String
)
