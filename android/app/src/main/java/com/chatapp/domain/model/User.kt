package com.chatapp.domain.model

data class User(
    val id: String,
    val phoneNumber: String,
    val displayName: String,
    val profilePhoto: String? = null,
    val status: String? = null,
    val isBusiness: Boolean = false,
    val lastSeen: Long? = null
)
