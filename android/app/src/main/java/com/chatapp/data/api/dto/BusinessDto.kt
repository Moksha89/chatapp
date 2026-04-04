package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

// Group/Channel
data class CreateGroupChatRequest(
    @SerializedName("type") val type: String,
    @SerializedName("name") val name: String,
    @SerializedName("participantIds") val participantIds: List<String> = emptyList()
)

data class AddParticipantRequest(
    @SerializedName("userId") val userId: String
)

// Products
data class ProductResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String? = null,
    @SerializedName("price") val price: Double,
    @SerializedName("currency") val currency: String? = "USD",
    @SerializedName("imageUrl") val imageUrl: String? = null,
    @SerializedName("inStock") val inStock: Boolean = true,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class CreateProductRequest(
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String? = null,
    @SerializedName("price") val price: Double,
    @SerializedName("currency") val currency: String = "USD",
    @SerializedName("imageUrl") val imageUrl: String? = null
)

// Orders
data class OrderResponse(
    @SerializedName("id") val id: String,
    @SerializedName("userId") val userId: String? = null,
    @SerializedName("items") val items: List<OrderItemResponse>? = null,
    @SerializedName("status") val status: String,
    @SerializedName("totalAmount") val totalAmount: Double? = 0.0,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class OrderItemResponse(
    @SerializedName("productId") val productId: String,
    @SerializedName("productName") val productName: String? = null,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("price") val price: Double
)

data class CreateOrderRequest(
    @SerializedName("items") val items: List<OrderItemRequest>,
    @SerializedName("userId") val userId: String? = null
)

data class OrderItemRequest(
    @SerializedName("productId") val productId: String,
    @SerializedName("quantity") val quantity: Int
)

data class UpdateOrderStatusRequest(
    @SerializedName("status") val status: String
)

// Labels
data class LabelResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("color") val color: String,
    @SerializedName("chatCount") val chatCount: Int? = 0
)

data class CreateLabelRequest(
    @SerializedName("name") val name: String,
    @SerializedName("color") val color: String
)

// Quick Replies
data class QuickReplyResponse(
    @SerializedName("id") val id: String,
    @SerializedName("shortcut") val shortcut: String,
    @SerializedName("message") val message: String
)

data class CreateQuickReplyRequest(
    @SerializedName("shortcut") val shortcut: String,
    @SerializedName("message") val message: String
)

// Broadcasts
data class BroadcastResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("recipientIds") val recipientIds: List<String>? = null,
    @SerializedName("lastSentAt") val lastSentAt: String? = null
)

data class CreateBroadcastRequest(
    @SerializedName("name") val name: String,
    @SerializedName("recipientIds") val recipientIds: List<String>
)

// Auto-Replies
data class AutoReplyResponse(
    @SerializedName("id") val id: String,
    @SerializedName("trigger") val trigger: String,
    @SerializedName("response") val response: String,
    @SerializedName("isActive") val isActive: Boolean = true
)

data class CreateAutoReplyRequest(
    @SerializedName("trigger") val trigger: String,
    @SerializedName("response") val response: String
)

// Business Profile
data class BusinessProfileResponse(
    @SerializedName("businessName") val businessName: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("address") val address: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("website") val website: String? = null,
    @SerializedName("category") val category: String? = null
)

data class UpdateBusinessProfileRequest(
    @SerializedName("businessName") val businessName: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("address") val address: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("website") val website: String? = null,
    @SerializedName("category") val category: String? = null
)

// Contacts
data class ContactResponse(
    @SerializedName("id") val id: String,
    @SerializedName("phoneNumber") val phoneNumber: String,
    @SerializedName("displayName") val displayName: String,
    @SerializedName("profilePhoto") val profilePhoto: String? = null,
    @SerializedName("isRegistered") val isRegistered: Boolean = false
)

data class SyncContactsRequest(
    @SerializedName("contacts") val contacts: List<SyncContactEntry>
)

data class SyncContactEntry(
    @SerializedName("phoneNumber") val phoneNumber: String,
    @SerializedName("displayName") val displayName: String
)

// Media
data class MediaUploadResponse(
    @SerializedName("url") val url: String,
    @SerializedName("filename") val filename: String? = null,
    @SerializedName("mimeType") val mimeType: String? = null,
    @SerializedName("size") val size: Long? = null
)

// Chat Export
data class ChatExportResponse(
    @SerializedName("data") val data: String,
    @SerializedName("format") val format: String
)

// FCM
data class RegisterFcmTokenRequest(
    @SerializedName("token") val token: String,
    @SerializedName("deviceId") val deviceId: String
)
