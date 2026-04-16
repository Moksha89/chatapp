package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class UploadKeysRequest(
    @SerializedName("identityKey") val identityKey: String,
    @SerializedName("signedPreKey") val signedPreKey: SignedPreKeyDto,
    @SerializedName("preKeys") val preKeys: List<PreKeyDto>
)

data class SignedPreKeyDto(
    @SerializedName("keyId") val keyId: Int,
    @SerializedName("publicKey") val publicKey: String,
    @SerializedName("signature") val signature: String
)

data class PreKeyDto(
    @SerializedName("keyId") val keyId: Int,
    @SerializedName("publicKey") val publicKey: String
)

data class KeyBundleResponse(
    @SerializedName("identityKey") val identityKey: String,
    @SerializedName("signedPreKey") val signedPreKey: SignedPreKeyDto,
    @SerializedName("preKey") val preKey: PreKeyDto? = null,
    @SerializedName("deviceId") val deviceId: String
)

data class PrekeyCountResponse(
    @SerializedName("count") val count: Int
)

data class UserDevicesResponse(
    @SerializedName("devices") val devices: List<DeviceKeyInfo>
)

data class DeviceKeyInfo(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("hasKeys") val hasKeys: Boolean = false
)
