package com.chatapp.domain.model

data class Product(
    val id: String,
    val name: String,
    val description: String? = null,
    val price: Double,
    val currency: String = "USD",
    val imageUrl: String? = null,
    val inStock: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

data class Order(
    val id: String,
    val userId: String,
    val items: List<OrderItem>,
    val status: OrderStatus,
    val totalAmount: Double,
    val createdAt: Long = System.currentTimeMillis()
)

data class OrderItem(
    val productId: String,
    val productName: String,
    val quantity: Int,
    val price: Double
)

enum class OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED
}

data class Label(
    val id: String,
    val name: String,
    val color: String,
    val chatCount: Int = 0
)

data class QuickReply(
    val id: String,
    val shortcut: String,
    val message: String
)

data class Broadcast(
    val id: String,
    val name: String,
    val recipientCount: Int = 0,
    val lastSentAt: Long? = null
)

data class AutoReply(
    val id: String,
    val trigger: String,
    val response: String,
    val isActive: Boolean = true
)

data class BusinessProfile(
    val businessName: String? = null,
    val description: String? = null,
    val address: String? = null,
    val email: String? = null,
    val website: String? = null,
    val category: String? = null
)

data class Contact(
    val id: String,
    val phoneNumber: String,
    val displayName: String,
    val profilePhoto: String? = null,
    val isRegistered: Boolean = false
)

data class GifResult(
    val id: String,
    val url: String,
    val previewUrl: String,
    val width: Int,
    val height: Int
)
