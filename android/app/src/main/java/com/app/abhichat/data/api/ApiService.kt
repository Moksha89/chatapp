package com.app.abhichat.data.api

import com.app.abhichat.data.model.*
import retrofit2.http.*

interface ApiService {

    @POST("auth/send-otp")
    suspend fun sendOtp(@Body request: SendOtpRequest): SendOtpResponse

    @POST("auth/verify-otp")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): VerifyOtpResponse

    @GET("auth/qr/generate")
    suspend fun generateQrToken(): QrGenerateResponse

    @POST("auth/qr/scan")
    suspend fun scanQr(@Body request: QrScanRequest): QrScanResponse

    @GET("users/me")
    suspend fun getMe(): User

    @PUT("users/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): User

    @GET("users/search")
    suspend fun searchUsers(@Query("phone") phone: String): List<User>

    @GET("chats")
    suspend fun getChats(): List<ChatItem>

    @POST("chats")
    suspend fun createChat(@Body request: CreateChatRequest): CreateChatResponse

    @GET("chats/{chatId}/messages")
    suspend fun getMessages(
        @Path("chatId") chatId: String,
        @Query("limit") limit: Int = 50,
        @Query("before") before: String? = null
    ): List<Message>

    @POST("chats/{chatId}/read")
    suspend fun markAsRead(@Path("chatId") chatId: String)
}
