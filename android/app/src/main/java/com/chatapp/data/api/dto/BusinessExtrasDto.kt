package com.chatapp.data.api.dto

import com.google.gson.annotations.SerializedName

data class MessageTemplateResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("content") val content: String,
    @SerializedName("category") val category: String? = null,
    @SerializedName("language") val language: String? = null
)

data class CreateMessageTemplateRequest(
    @SerializedName("name") val name: String,
    @SerializedName("content") val content: String,
    @SerializedName("category") val category: String? = null,
    @SerializedName("language") val language: String = "en"
)

data class CreatePaymentLinkRequest(
    @SerializedName("amount") val amount: Double,
    @SerializedName("currency") val currency: String = "USD",
    @SerializedName("description") val description: String? = null
)

data class PaymentLinkResponse(
    @SerializedName("id") val id: String,
    @SerializedName("url") val url: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("currency") val currency: String
)

data class PaymentHistoryResponse(
    @SerializedName("id") val id: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("currency") val currency: String,
    @SerializedName("status") val status: String,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class CatalogShareResponse(
    @SerializedName("shareLink") val shareLink: String
)

data class FlowResponse(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("steps") val steps: List<FlowStepResponse> = emptyList(),
    @SerializedName("isActive") val isActive: Boolean = true
)

data class FlowStepResponse(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String,
    @SerializedName("content") val content: String? = null
)

data class CreateFlowRequest(
    @SerializedName("name") val name: String,
    @SerializedName("steps") val steps: List<CreateFlowStepRequest> = emptyList()
)

data class CreateFlowStepRequest(
    @SerializedName("type") val type: String,
    @SerializedName("content") val content: String? = null
)

data class ScheduleMessageRequest(
    @SerializedName("content") val content: String,
    @SerializedName("type") val type: String = "text",
    @SerializedName("scheduledAt") val scheduledAt: String
)

data class ScheduleMessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("scheduledAt") val scheduledAt: String
)

data class ScheduledMessageResponse(
    @SerializedName("id") val id: String,
    @SerializedName("chatId") val chatId: String,
    @SerializedName("content") val content: String,
    @SerializedName("type") val type: String,
    @SerializedName("scheduledAt") val scheduledAt: String,
    @SerializedName("status") val status: String = "pending"
)
