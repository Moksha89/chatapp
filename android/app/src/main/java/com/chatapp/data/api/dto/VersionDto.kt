package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class VersionCheckResponse(
    @SerializedName("android") val android: AndroidVersion
)

data class AndroidVersion(
    @SerializedName("versionCode") val versionCode: Int,
    @SerializedName("versionName") val versionName: String,
    @SerializedName("downloadUrl") val downloadUrl: String,
    @SerializedName("releaseNotes") val releaseNotes: String,
    @SerializedName("forceUpdate") val forceUpdate: Boolean,
    @SerializedName("minVersionCode") val minVersionCode: Int
)
