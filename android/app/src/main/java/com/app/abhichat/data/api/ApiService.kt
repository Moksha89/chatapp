package com.app.abhichat.data.api

import com.app.abhichat.data.model.*
import retrofit2.http.*

interface ApiService {
    @POST("auth/send-otp")
    suspend fun sendOtp(@Body body: SendOtpRequest): OtpResponse

    @POST("auth/verify-otp")
    suspend fun verifyOtp(@Body body: VerifyOtpRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: RefreshRequest): AuthResponse

    @GET("users/me")
    suspend fun getMe(): User

    @PUT("users/me")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): User

    @GET("users/search")
    suspend fun searchUsers(@Query("q") query: String): List<User>

    @GET("users/all")
    suspend fun getAllUsers(): List<User>

    @GET("chats")
    suspend fun getChats(): List<Chat>

    @GET("chats/{id}")
    suspend fun getChatById(@Path("id") chatId: String): Chat

    @POST("chats/direct")
    suspend fun createDirectChat(@Body body: CreateDirectChatRequest): Chat

    @GET("chats/{id}/messages")
    suspend fun getMessages(
        @Path("id") chatId: String,
        @Query("limit") limit: Int = 50,
        @Query("before") before: String? = null
    ): List<Message>

    @POST("chats/{id}/read")
    suspend fun markRead(@Path("id") chatId: String)

    @POST("calls/initiate")
    suspend fun initiateCall(@Body body: InitiateCallRequest): CallResponse

    @POST("calls/livekit-token")
    suspend fun getLiveKitToken(@Body body: LiveKitTokenRequest): TokenResponse

    @POST("notifications/register-device")
    suspend fun registerDevice(@Body body: RegisterDeviceRequest)
}
