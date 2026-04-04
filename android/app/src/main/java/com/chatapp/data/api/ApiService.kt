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

    // Group/Channel Management
    @POST("chats")
    suspend fun createGroupChat(@Body request: CreateGroupChatRequest): ChatResponse

    @POST("chats/{chatId}/participants")
    suspend fun addParticipant(
        @Path("chatId") chatId: String,
        @Body request: AddParticipantRequest
    ): ChatResponse

    @DELETE("chats/{chatId}/participants/{userId}")
    suspend fun removeParticipant(
        @Path("chatId") chatId: String,
        @Path("userId") userId: String
    )

    @DELETE("chats/{chatId}")
    suspend fun deleteChat(@Path("chatId") chatId: String)

    // Products
    @GET("products")
    suspend fun getProducts(): List<ProductResponse>

    @POST("products")
    suspend fun createProduct(@Body request: CreateProductRequest): ProductResponse

    @PUT("products/{id}")
    suspend fun updateProduct(
        @Path("id") id: String,
        @Body request: CreateProductRequest
    ): ProductResponse

    @DELETE("products/{id}")
    suspend fun deleteProduct(@Path("id") id: String)

    // Orders
    @GET("orders")
    suspend fun getOrders(): List<OrderResponse>

    @POST("orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): OrderResponse

    @PATCH("orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") id: String,
        @Body request: UpdateOrderStatusRequest
    ): OrderResponse

    // Labels
    @GET("labels")
    suspend fun getLabels(): List<LabelResponse>

    @POST("labels")
    suspend fun createLabel(@Body request: CreateLabelRequest): LabelResponse

    @DELETE("labels/{id}")
    suspend fun deleteLabel(@Path("id") id: String)

    // Quick Replies
    @GET("quick-replies")
    suspend fun getQuickReplies(): List<QuickReplyResponse>

    @POST("quick-replies")
    suspend fun createQuickReply(@Body request: CreateQuickReplyRequest): QuickReplyResponse

    @DELETE("quick-replies/{id}")
    suspend fun deleteQuickReply(@Path("id") id: String)

    // Broadcasts
    @GET("broadcasts")
    suspend fun getBroadcasts(): List<BroadcastResponse>

    @POST("broadcasts")
    suspend fun createBroadcast(@Body request: CreateBroadcastRequest): BroadcastResponse

    // Auto-Replies
    @GET("auto-replies")
    suspend fun getAutoReplies(): List<AutoReplyResponse>

    @POST("auto-replies")
    suspend fun createAutoReply(@Body request: CreateAutoReplyRequest): AutoReplyResponse

    @DELETE("auto-replies/{id}")
    suspend fun deleteAutoReply(@Path("id") id: String)

    // Business Profile
    @GET("business/profile")
    suspend fun getBusinessProfile(): BusinessProfileResponse

    @PATCH("business/profile")
    suspend fun updateBusinessProfile(@Body request: UpdateBusinessProfileRequest): BusinessProfileResponse

    // Contacts
    @GET("contacts")
    suspend fun getContacts(): List<ContactResponse>

    @POST("contacts/sync")
    suspend fun syncContacts(@Body request: SyncContactsRequest): List<ContactResponse>

    // Media
    @Multipart
    @POST("media/upload")
    suspend fun uploadMedia(
        @Part file: okhttp3.MultipartBody.Part
    ): MediaUploadResponse

    // Chat Backup
    @GET("chats/{chatId}/export")
    suspend fun exportChat(
        @Path("chatId") chatId: String,
        @Query("format") format: String = "json"
    ): ChatExportResponse

    // FCM Token
    @POST("notifications/fcm-token")
    suspend fun registerFcmToken(@Body request: RegisterFcmTokenRequest)
}
