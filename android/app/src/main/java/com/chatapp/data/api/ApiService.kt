package com.chatapp.data.api

import com.chatapp.data.api.dto.*
import retrofit2.http.*

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

    @GET("users/all")
    suspend fun getAllUsers(): List<UserResponse>

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

    @POST("auth/qr/create")
    suspend fun createQrPairingSession(@Body request: CreateQrSessionRequest): CreateQrSessionResponse

    @GET("auth/qr/status/{pairingCode}")
    suspend fun getQrPairingStatus(@Path("pairingCode") pairingCode: String): QrPairingStatusResponse

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

    // Get single message
    @GET("chats/{chatId}/messages/{messageId}")
    suspend fun getMessage(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String
    ): MessageResponse

    // Privacy Settings
    @GET("users/me/privacy")
    suspend fun getPrivacySettings(): PrivacySettingsResponse

    @PATCH("users/me/privacy")
    suspend fun updatePrivacySettings(@Body request: UpdatePrivacySettingsRequest): PrivacySettingsResponse

    @GET("users/me/blocked")
    suspend fun getBlockedUsers(): List<String>

    @POST("users/me/block")
    suspend fun blockUser(@Body request: BlockUserRequest)

    @HTTP(method = "DELETE", path = "users/me/block", hasBody = true)
    suspend fun unblockUser(@Body request: BlockUserRequest)

    @POST("users/{userId}/report")
    suspend fun reportUser(
        @Path("userId") userId: String,
        @Body request: ReportUserRequest
    ): ReportUserResponse

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

    @PUT("chats/{chatId}")
    suspend fun updateGroupInfo(
        @Path("chatId") chatId: String,
        @Body request: UpdateGroupInfoRequest
    ): ChatResponse

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

    @POST("chats/{chatId}/participants/{participantId}/admin")
    suspend fun makeAdmin(
        @Path("chatId") chatId: String,
        @Path("participantId") participantId: String
    ): GenericIdResponse

    @DELETE("chats/{chatId}/participants/{participantId}/admin")
    suspend fun removeAdmin(
        @Path("chatId") chatId: String,
        @Path("participantId") participantId: String
    ): GenericIdResponse

    @POST("chats/{chatId}/leave")
    suspend fun leaveGroup(@Path("chatId") chatId: String): GenericMessageResponse

    @GET("chats/{chatId}/invite-link")
    suspend fun getGroupInviteLink(@Path("chatId") chatId: String): InviteLinkResponse

    @POST("chats/{chatId}/invite-link/revoke")
    suspend fun revokeGroupInviteLink(@Path("chatId") chatId: String): InviteLinkResponse

    @PUT("chats/{chatId}/permissions")
    suspend fun updateGroupPermissions(
        @Path("chatId") chatId: String,
        @Body request: GroupPermissionsRequest
    ): GenericIdResponse

    @GET("chats/{chatId}/permissions")
    suspend fun getGroupPermissions(@Path("chatId") chatId: String): GroupPermissionsResponse

    @DELETE("chats/{chatId}")
    suspend fun deleteChat(@Path("chatId") chatId: String)

    @POST("chats/channels")
    suspend fun createChannel(@Body request: CreateChannelRequest): ChatResponse

    @POST("chats/communities")
    suspend fun createCommunity(@Body request: CreateCommunityRequest): ChatResponse

    @POST("chats/{chatId}/pin-message")
    suspend fun pinMessage(
        @Path("chatId") chatId: String,
        @Body request: PinMessageRequest
    ): PinMessageResponse

    @PUT("chats/{chatId}/wallpaper")
    suspend fun setChatWallpaper(
        @Path("chatId") chatId: String,
        @Body request: SetWallpaperRequest
    ): SetWallpaperResponse

    @POST("chats/{chatId}/lock")
    suspend fun toggleChatLock(@Path("chatId") chatId: String): ChatLockResponse

    @PUT("chats/{chatId}/disappearing")
    suspend fun setDisappearingMessages(
        @Path("chatId") chatId: String,
        @Body request: DisappearingMessagesRequest
    ): DisappearingMessagesResponse

    @PUT("chats/{chatId}/pin-conversation")
    suspend fun pinConversation(
        @Path("chatId") chatId: String,
        @Body request: PinConversationRequest
    ): PinConversationResponse

    @PUT("chats/{chatId}/mute")
    suspend fun muteConversation(
        @Path("chatId") chatId: String,
        @Body request: MuteConversationRequest
    ): MuteConversationResponse

    @PUT("chats/{chatId}/archive")
    suspend fun archiveConversation(
        @Path("chatId") chatId: String,
        @Body request: ArchiveConversationRequest
    ): ArchiveConversationResponse

    @PUT("chats/{chatId}/favorite")
    suspend fun favoriteConversation(
        @Path("chatId") chatId: String,
        @Body request: FavoriteConversationRequest
    ): FavoriteConversationResponse

    @POST("chats/{chatId}/clear")
    suspend fun clearChatHistory(@Path("chatId") chatId: String): ClearChatResponse

    @POST("chats/{chatId}/report")
    suspend fun reportContact(
        @Path("chatId") chatId: String,
        @Body request: ReportContactRequest
    ): GenericMessageResponse

    @GET("chats/starred/messages")
    suspend fun getStarredMessages(): List<MessageResponse>

    @POST("chats/{chatId}/messages/{messageId}/star")
    suspend fun toggleMessageStar(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String
    ): StarMessageResponse

    @POST("chats/{chatId}/messages/{messageId}/forward")
    suspend fun forwardMessage(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String,
        @Body request: ForwardMessageRequest
    ): ForwardMessageResponse

    @GET("chats/search/messages")
    suspend fun searchMessages(
        @Query("q") query: String,
        @Query("limit") limit: Int = 50
    ): List<MessageResponse>

    @GET("chats/{chatId}/messages/{messageId}/seen-by")
    suspend fun getMessageSeenBy(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String
    ): List<SeenByResponse>

    @GET("chats/{chatId}/shared-media")
    suspend fun getChatSharedMedia(@Path("chatId") chatId: String): List<MessageResponse>

    @POST("chats/{chatId}/messages/{messageId}/vote")
    suspend fun votePoll(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String,
        @Body request: VotePollRequest
    ): VotePollResponse

    @POST("chats/{chatId}/messages/{messageId}/view-once")
    suspend fun markViewOnceViewed(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String
    ): ViewOnceResponse

    @GET("chats/{chatId}/backup")
    suspend fun backupChat(
        @Path("chatId") chatId: String,
        @Query("format") format: String = "text"
    ): ChatBackupContentResponse

    @POST("chats/{chatId}/chatbot")
    suspend fun configureChatbot(
        @Path("chatId") chatId: String,
        @Body request: ChatbotConfigRequest
    ): ChatbotConfigResponse

    @GET("chats/{chatId}/chatbot")
    suspend fun getChatbot(@Path("chatId") chatId: String): ChatbotConfigResponse

    @POST("chats/{chatId}/messages/{messageId}/flow")
    suspend fun submitFlowResponse(
        @Path("chatId") chatId: String,
        @Path("messageId") messageId: String,
        @Body request: FlowResponseRequest
    ): GenericIdResponse

    // Products
    @GET("products")
    suspend fun getProducts(): List<ProductResponse>

    @POST("products")
    suspend fun createProduct(@Body request: CreateProductRequest): ProductResponse

    @PUT("products/{id}")
    suspend fun updateProduct(@Path("id") id: String, @Body request: CreateProductRequest): ProductResponse

    @DELETE("products/{id}")
    suspend fun deleteProduct(@Path("id") id: String)

    @POST("products/{id}/toggle-availability")
    suspend fun toggleProductAvailability(@Path("id") id: String): ToggleProductResponse

    // Orders
    @GET("orders")
    suspend fun getOrders(): List<OrderResponse>

    @POST("orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): OrderResponse

    @PATCH("orders/{id}/status")
    suspend fun updateOrderStatus(@Path("id") id: String, @Body request: UpdateOrderStatusRequest): OrderResponse

    // Labels
    @GET("labels")
    suspend fun getLabels(): List<LabelResponse>

    @POST("labels")
    suspend fun createLabel(@Body request: CreateLabelRequest): LabelResponse

    @PATCH("labels/{id}")
    suspend fun updateLabel(@Path("id") id: String, @Body request: CreateLabelRequest): LabelResponse

    @DELETE("labels/{id}")
    suspend fun deleteLabel(@Path("id") id: String)

    @POST("labels/chats/{chatId}")
    suspend fun assignLabelsToChat(@Path("chatId") chatId: String, @Body request: AssignLabelsRequest): List<ChatLabelResponse>

    @DELETE("labels/chats/{chatId}/{labelId}")
    suspend fun removeLabelFromChat(@Path("chatId") chatId: String, @Path("labelId") labelId: String): GenericMessageResponse

    @GET("labels/{labelId}/chats")
    suspend fun getChatsByLabel(@Path("labelId") labelId: String): List<String>

    // Quick Replies
    @GET("quick-replies")
    suspend fun getQuickReplies(): List<QuickReplyResponse>

    @POST("quick-replies")
    suspend fun createQuickReply(@Body request: CreateQuickReplyRequest): QuickReplyResponse

    @PATCH("quick-replies/{id}")
    suspend fun updateQuickReply(@Path("id") id: String, @Body request: CreateQuickReplyRequest): QuickReplyResponse

    @DELETE("quick-replies/{id}")
    suspend fun deleteQuickReply(@Path("id") id: String)

    // Broadcasts
    @GET("broadcasts")
    suspend fun getBroadcasts(): List<BroadcastResponse>

    @POST("broadcasts")
    suspend fun createBroadcast(@Body request: CreateBroadcastRequest): BroadcastResponse

    @PUT("broadcasts/{id}")
    suspend fun updateBroadcast(@Path("id") id: String, @Body request: CreateBroadcastRequest): BroadcastResponse

    @DELETE("broadcasts/{id}")
    suspend fun deleteBroadcast(@Path("id") id: String): GenericMessageResponse

    @GET("broadcasts/{id}/analytics")
    suspend fun getBroadcastAnalytics(@Path("id") id: String): BroadcastAnalyticsResponse

    // Auto-Replies
    @GET("auto-replies")
    suspend fun getAutoReplies(): List<AutoReplyResponse>

    @POST("auto-replies")
    suspend fun createAutoReply(@Body request: CreateAutoReplyRequest): AutoReplyResponse

    @PUT("auto-replies/{id}")
    suspend fun updateAutoReply(@Path("id") id: String, @Body request: CreateAutoReplyRequest): AutoReplyResponse

    @DELETE("auto-replies/{id}")
    suspend fun deleteAutoReply(@Path("id") id: String)

    @POST("auto-replies/{id}/toggle")
    suspend fun toggleAutoReply(@Path("id") id: String): ToggleAutoReplyResponse

    // Business Profile
    @GET("business/profile")
    suspend fun getBusinessProfile(): BusinessProfileResponse

    @PUT("business/profile")
    suspend fun updateBusinessProfile(@Body request: UpdateBusinessProfileRequest): BusinessProfileResponse

    // Business Templates
    @GET("business/templates")
    suspend fun getMessageTemplates(): List<MessageTemplateResponse>

    @POST("business/templates")
    suspend fun createMessageTemplate(@Body request: CreateMessageTemplateRequest): GenericIdResponse

    // Business Payments
    @POST("business/payments/link")
    suspend fun createPaymentLink(@Body request: CreatePaymentLinkRequest): PaymentLinkResponse

    @GET("business/payments/history")
    suspend fun getPaymentHistory(): List<PaymentHistoryResponse>

    @GET("business/catalog/share")
    suspend fun getCatalogShareLink(): CatalogShareResponse

    // Business Flows
    @GET("business/flows")
    suspend fun getFlows(): List<FlowResponse>

    @POST("business/flows")
    suspend fun createFlow(@Body request: CreateFlowRequest): GenericIdResponse

    // Scheduled Messages
    @POST("chats/{chatId}/messages/schedule")
    suspend fun scheduleMessage(@Path("chatId") chatId: String, @Body request: ScheduleMessageRequest): ScheduleMessageResponse

    @GET("messages/scheduled")
    suspend fun getScheduledMessages(): List<ScheduledMessageResponse>

    // Status/Stories
    @GET("status/my")
    suspend fun getMyStatuses(): List<StatusResponse>

    @GET("status/contacts")
    suspend fun getContactStatuses(): List<StatusResponse>

    @POST("status")
    suspend fun createStatus(@Body request: CreateStatusRequest): GenericIdResponse

    @POST("status/{statusId}/view")
    suspend fun viewStatus(@Path("statusId") statusId: String): GenericSuccessResponse

    @DELETE("status/{statusId}")
    suspend fun deleteStatus(@Path("statusId") statusId: String): GenericMessageResponse

    // Contacts
    @GET("contacts")
    suspend fun getContacts(): List<ContactResponse>

    @POST("contacts")
    suspend fun createContact(@Body request: CreateContactRequest): ContactResponse

    @PATCH("contacts/{id}")
    suspend fun updateContact(@Path("id") id: String, @Body request: UpdateContactRequest): ContactResponse

    @DELETE("contacts/{id}")
    suspend fun deleteContact(@Path("id") id: String): GenericMessageResponse

    @POST("contacts/sync")
    suspend fun syncContacts(@Body request: SyncContactsRequest): List<ContactResponse>

    @POST("contacts/invite")
    suspend fun inviteByPhone(@Body request: InviteByPhoneRequest): InviteSentResponse

    @GET("users/invite-link")
    suspend fun getInviteLink(): InviteLinkWithQrResponse

    // Media
    @Multipart
    @POST("media/upload")
    suspend fun uploadMedia(@Part file: okhttp3.MultipartBody.Part): MediaUploadResponse

    // Chat Export
    @GET("chats/{chatId}/export")
    suspend fun exportChat(@Path("chatId") chatId: String, @Query("format") format: String = "json"): ChatExportResponse

    // FCM Token
    @POST("notifications/fcm-token")
    suspend fun registerFcmToken(@Body request: RegisterFcmTokenRequest)

    // Crypto/E2EE
    @POST("crypto/keys/{deviceId}")
    suspend fun uploadKeys(@Path("deviceId") deviceId: String, @Body request: UploadKeysRequest): GenericSuccessResponse

    @GET("crypto/keys/{userId}/bundle")
    suspend fun getKeyBundle(@Path("userId") userId: String, @Query("deviceId") deviceId: String? = null): KeyBundleResponse?

    @GET("crypto/keys/{deviceId}/prekey-count")
    suspend fun getPrekeyCount(@Path("deviceId") deviceId: String): PrekeyCountResponse

    @GET("crypto/keys/{userId}")
    suspend fun getUserDevices(@Path("userId") userId: String): UserDevicesResponse

    // Two-step verification
    @POST("users/me/two-step")
    suspend fun enableTwoStepVerification(@Body request: TwoStepEnableRequest): TwoStepResponse

    @DELETE("users/me/two-step")
    suspend fun disableTwoStepVerification(): TwoStepResponse

    @POST("users/me/two-step/verify")
    suspend fun verifyTwoStepPin(@Body request: TwoStepVerifyRequest): TwoStepVerifyResponse

    // Enhanced Privacy
    @PUT("users/me/privacy/last-seen")
    suspend fun updateLastSeenPrivacy(@Body request: LastSeenPrivacyRequest): LastSeenPrivacyResponse

    @GET("chats/{chatId}/safety-number")
    suspend fun getSafetyNumber(@Path("chatId") chatId: String): SafetyNumberResponse

    @POST("chats/{chatId}/safety-number/verify")
    suspend fun verifySafetyNumber(@Path("chatId") chatId: String, @Body request: VerifySafetyNumberRequest): VerifySafetyNumberResponse

    @PUT("users/me/privacy/calls")
    suspend fun updateCallPrivacy(@Body request: CallPrivacyRequest): CallPrivacyResponse

    // Friends
    @GET("friends")
    suspend fun getFriends(): List<FriendResponse>

    @GET("friends/requests/pending")
    suspend fun getFriendRequests(): List<FriendRequestResponse>

    @GET("friends/requests/sent")
    suspend fun getSentFriendRequests(): List<FriendRequestResponse>

    @GET("friends/suggestions")
    suspend fun getFriendSuggestions(): List<UserResponse>

    @POST("friends/request")
    suspend fun sendFriendRequest(@Body request: FriendRequestBody): FriendRequestStatusResponse

    @POST("friends/{requestId}/accept")
    suspend fun acceptFriendRequest(@Path("requestId") requestId: String): FriendRequestStatusResponse

    @POST("friends/{requestId}/decline")
    suspend fun declineFriendRequest(@Path("requestId") requestId: String): FriendRequestStatusResponse

    @DELETE("friends/{friendshipId}")
    suspend fun removeFriend(@Path("friendshipId") friendshipId: String): GenericMessageResponse

    @POST("friends/block")
    suspend fun blockFriend(@Body request: FriendRequestBody): FriendRequestStatusResponse

    @POST("friends/unblock")
    suspend fun unblockFriend(@Body request: FriendRequestBody): GenericMessageResponse

    // Calls
    @GET("calls/history")
    suspend fun getCallHistory(): List<CallHistoryResponse>

    @POST("calls/initiate")
    suspend fun initiateCall(@Body request: InitiateCallRequest): CallStatusResponse

    @POST("calls/{callId}/answer")
    suspend fun answerCallApi(@Path("callId") callId: String): CallStatusResponse

    @POST("calls/{callId}/decline")
    suspend fun declineCallApi(@Path("callId") callId: String): CallStatusResponse

    @POST("calls/{callId}/end")
    suspend fun endCallApi(@Path("callId") callId: String): EndCallResponse

    // Stickers
    @GET("admin/stickers")
    suspend fun getStickers(): List<StickerResponse>

    // Backup
    @GET("backup/chats/{chatId}/export")
    suspend fun exportChatBackup(@Path("chatId") chatId: String, @Query("format") format: String = "text", @Query("includeMedia") includeMedia: Boolean = false): ChatBackupContentResponse

    @GET("backup/google/auth")
    suspend fun getGoogleDriveAuthUrl(): GoogleDriveAuthResponse

    // Settings
    @GET("settings/notifications")
    suspend fun getNotificationSettings(): NotificationSettingsResponse

    @PUT("settings/notifications")
    suspend fun updateNotificationSettings(@Body request: UpdateNotificationSettingsRequest): GenericSuccessResponse

    @GET("settings/storage")
    suspend fun getStorageUsage(): StorageUsageResponse

    @DELETE("settings/storage/{chatId}")
    suspend fun clearChatStorage(@Path("chatId") chatId: String): ClearStorageResponse

    @GET("settings/theme")
    suspend fun getThemeSettings(): ThemeSettingsResponse

    @PUT("settings/theme")
    suspend fun updateThemeSettings(@Body request: UpdateThemeSettingsRequest): GenericSuccessResponse

    @GET("version")
    suspend fun getAppVersion(): AppVersionResponse

    @POST("settings/backup")
    suspend fun createChatBackup(@Body request: CreateBackupRequest): CreateBackupResponse

    @GET("settings/backup/history")
    suspend fun getBackupHistory(): List<BackupHistoryResponse>

    // Admin
    @GET("admin/dashboard/country-stats")
    suspend fun getCountryStats(): List<CountryStatResponse>

    @GET("admin/approvals/pending")
    suspend fun getPendingApprovals(@Query("page") page: Int = 1): PendingApprovalsResponse

    @POST("admin/users/{userId}/approve")
    suspend fun approveUser(@Path("userId") userId: String): GenericIdResponse

    @POST("admin/users/{userId}/reject")
    suspend fun rejectUser(@Path("userId") userId: String): GenericSuccessResponse

    @POST("admin/users/create")
    suspend fun adminCreateUser(@Body request: AdminCreateUserRequest): UserResponse

    @POST("admin/status/global")
    suspend fun postGlobalStatus(@Body request: GlobalStatusRequest): GenericIdResponse

    @GET("admin/limits")
    suspend fun getConfigurableLimits(): Map<String, String>
}
