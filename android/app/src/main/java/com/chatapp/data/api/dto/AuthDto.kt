package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class SendOtpRequest(
    @SerializedName("phoneNumber") val phoneNumber: String
)

data class SendOtpResponse(
    @SerializedName("message") val message: String,
    @SerializedName("otp") val otp: String? = null
)

data class RegisterRequest(
    @SerializedName("phoneNumber") val phoneNumber: String,
    @SerializedName("otp") val otp: String,
    @SerializedName("displayName") val displayName: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("deviceType") val deviceType: String,
    @SerializedName("isBusiness") val isBusiness: Boolean
)

data class LoginRequest(
    @SerializedName("phoneNumber") val phoneNumber: String,
    @SerializedName("otp") val otp: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("deviceType") val deviceType: String
)

data class AuthResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("expiresIn") val expiresIn: Int,
    @SerializedName("user") val user: UserDto
)

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("phoneNumber") val phoneNumber: String,
    @SerializedName("displayName") val displayName: String
)

data class RefreshTokenRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class RefreshTokenResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("expiresIn") val expiresIn: Int
)

data class QrPairingRequest(
    @SerializedName("pairingCode") val pairingCode: String
)

data class QrPairingResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String
)
