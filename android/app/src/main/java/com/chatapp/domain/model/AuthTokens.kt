package com.chatapp.domain.model

data class AuthTokens(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int
)

data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int,
    val user: User
)
