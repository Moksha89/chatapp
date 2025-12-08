package com.chatapp.data.api

import com.chatapp.data.api.dto.*
import retrofit2.http.*

interface ApiService {
    @POST("auth/send-otp")
    suspend fun sendOtp(@Body request: SendOtpRequest): SendOtpResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

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
}
