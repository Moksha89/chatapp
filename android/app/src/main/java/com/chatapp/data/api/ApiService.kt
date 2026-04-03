package com.chatapp.data.api

import com.chatapp.data.api.dto.*
import retrofit2.http.*
import com.chatapp.data.api.dto.QrPairingRequest
import com.chatapp.data.api.dto.QrPairingResponse
import com.chatapp.data.api.dto.VersionCheckResponse

interface ApiService {
    @GET("version/check")
    suspend fun checkVersion(): VersionCheckResponse

    @POST("auth/send-otp")
    suspend fun sendOtp(@Body request: SendOtpRequest): SendOtpResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): RefreshTokenResponse

    @POST("auth/logout")
    suspend fun logout()

    @GET("users/me")
    suspend fun getCurrentUser(): UserResponse

    @PATCH("users/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): UserResponse

    @GET("chats")
    suspend fun getChats(): List<ChatResponse>

    @POST("chats")
    suspend fun createChat(@Body request: CreateChatRequest): ChatResponse

    @GET("chats/{chatId}/messages")
    suspend fun getMessages(
        @Path("chatId") chatId: String,
        @Query("limit") limit: Int = 50,
        @Query("before") before: String? = null
    ): List<MessageResponse>

    @POST("chats/{chatId}/messages")
    suspend fun sendMessage(
        @Path("chatId") chatId: String,
        @Body request: SendMessageRequest
    ): MessageResponse

    @POST("chats/{chatId}/messages/read")
    suspend fun markMessagesRead(
        @Path("chatId") chatId: String,
        @Body request: MarkReadRequest
    )

    @POST("users/search")
    suspend fun searchUsers(@Body request: SearchUsersRequest): List<UserResponse>

    @POST("auth/qr/confirm")
    suspend fun confirmQrPairing(@Body request: QrPairingRequest): QrPairingResponse

    // Message Reactions
    @POST("chats/{chatId}/messages/{messageId}/reactions")
    suspend fun addReaction(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String,
        @Body request: AddReactionRequest
    ): ReactionResponse

    @HTTP(method = "DELETE", path = "chats/{chatId}/messages/{messageId}/reactions", hasBody = true)
    suspend fun removeReaction(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String,
        @Body request: AddReactionRequest
    ): ReactionResponse

    // Edit Message
    @PUT("chats/{chatId}/messages/{messageId}")
    suspend fun editMessage(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String,
        @Body request: EditMessageRequest
    ): EditMessageResponse

    // Delete Message
    @DELETE("chats/{chatId}/messages/{messageId}")
    suspend fun deleteMessage(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String,
        @Query("deleteForEveryone") deleteForEveryone: Boolean
    ): DeleteMessageResponse

    // Privacy Settings
    @GET("users/me/privacy")
    suspend fun getPrivacySettings(): PrivacySettingsResponse

    @PATCH("users/me/privacy")
    suspend fun updatePrivacySettings(@Body request: UpdatePrivacySettingsRequest): PrivacySettingsResponse

    @POST("users/me/block")
    suspend fun blockUser(@Body request: BlockUserRequest)

    @HTTP(method = "DELETE", path = "users/me/block", hasBody = true)
    suspend fun unblockUser(@Body request: BlockUserRequest)

    // Devices
    @GET("devices")
    suspend fun getDevices(): List<DeviceResponse>

    @POST("devices")
    suspend fun registerDevice(@Body request: RegisterDeviceRequest): DeviceResponse

    @DELETE("devices/{deviceId}")
    suspend fun removeDevice(@Path("deviceId") deviceId: String): RemoveDeviceResponse
}
