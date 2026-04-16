package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class DeviceResponse(
    @SerializedName("id") val id: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("deviceType") val deviceType: String,
    @SerializedName("isPrimary") val isPrimary: Boolean,
    @SerializedName("isActive") val isActive: Boolean,
    @SerializedName("lastSeen") val lastSeen: String?
)

data class RegisterDeviceRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("deviceType") val deviceType: String
)

data class RemoveDeviceResponse(
    @SerializedName("message") val message: String
)
