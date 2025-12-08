package com.chatapp.domain.repository

import com.chatapp.domain.model.LoginResponse
import com.chatapp.domain.model.User

interface AuthRepository {
    suspend fun sendOtp(phoneNumber: String): Result<String?>
    suspend fun login(phoneNumber: String, otp: String, deviceId: String): Result<LoginResponse>
    suspend fun register(phoneNumber: String, otp: String, displayName: String, deviceId: String, isBusiness: Boolean): Result<LoginResponse>
    suspend fun logout(): Result<Unit>
    suspend fun getCurrentUser(): Result<User>
    fun isLoggedIn(): Boolean
    fun getAccessToken(): String?
}
