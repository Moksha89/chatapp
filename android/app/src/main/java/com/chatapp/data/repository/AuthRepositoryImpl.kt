package com.chatapp.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.LoginRequest
import com.chatapp.data.api.dto.RegisterRequest
import com.chatapp.data.api.dto.SendOtpRequest
import com.chatapp.domain.model.LoginResponse
import com.chatapp.domain.model.User
import com.chatapp.domain.repository.AuthRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val apiService: ApiService,
    @ApplicationContext private val context: Context
) : AuthRepository {

    private val prefs: SharedPreferences = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_PHONE_NUMBER = "phone_number"
        private const val KEY_DISPLAY_NAME = "display_name"
        private const val KEY_DEVICE_ID = "device_id"
    }

    override suspend fun sendOtp(phoneNumber: String): Result<String?> {
        return try {
            val response = apiService.sendOtp(SendOtpRequest(phoneNumber))
            // In dev mode, backend might return the OTP; in production it won't
            Result.success(response.otp)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun login(phoneNumber: String, otp: String, deviceId: String): Result<LoginResponse> {
        return try {
            val response = apiService.login(
                LoginRequest(
                    phoneNumber = phoneNumber,
                    otp = otp,
                    deviceId = deviceId,
                    deviceName = getDeviceName(),
                    deviceType = "android"
                )
            )
            
            val loginResponse = LoginResponse(
                accessToken = response.accessToken,
                refreshToken = response.refreshToken,
                expiresIn = response.expiresIn,
                user = User(
                    id = response.user.id,
                    phoneNumber = response.user.phoneNumber,
                    displayName = response.user.displayName
                )
            )
            
            // Save session
            saveSession(loginResponse)
            
            Result.success(loginResponse)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun register(
        phoneNumber: String,
        otp: String,
        displayName: String,
        deviceId: String,
        isBusiness: Boolean
    ): Result<LoginResponse> {
        return try {
            val response = apiService.register(
                RegisterRequest(
                    phoneNumber = phoneNumber,
                    otp = otp,
                    displayName = displayName,
                    deviceId = deviceId,
                    deviceName = getDeviceName(),
                    deviceType = "android",
                    isBusiness = isBusiness
                )
            )
            
            val loginResponse = LoginResponse(
                accessToken = response.accessToken,
                refreshToken = response.refreshToken,
                expiresIn = response.expiresIn,
                user = User(
                    id = response.user.id,
                    phoneNumber = response.user.phoneNumber,
                    displayName = response.user.displayName
                )
            )
            
            // Save session
            saveSession(loginResponse)
            
            Result.success(loginResponse)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun logout(): Result<Unit> {
        return try {
            apiService.logout()
            clearSession()
            Result.success(Unit)
        } catch (e: Exception) {
            // Clear session even if API call fails
            clearSession()
            Result.success(Unit)
        }
    }

    override suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = apiService.getCurrentUser()
            Result.success(
                User(
                    id = response.id,
                    phoneNumber = response.phoneNumber,
                    displayName = response.displayName,
                    profilePhoto = response.profilePhoto,
                    status = response.status,
                    isBusiness = response.isBusiness
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun isLoggedIn(): Boolean {
        return getAccessToken() != null
    }

    override fun getAccessToken(): String? {
        return prefs.getString(KEY_ACCESS_TOKEN, null)
    }

    fun getOrCreateDeviceId(): String {
        var deviceId = prefs.getString(KEY_DEVICE_ID, null)
        if (deviceId == null) {
            deviceId = UUID.randomUUID().toString()
            prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
        }
        return deviceId
    }

    private fun saveSession(loginResponse: LoginResponse) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, loginResponse.accessToken)
            .putString(KEY_REFRESH_TOKEN, loginResponse.refreshToken)
            .putString(KEY_USER_ID, loginResponse.user.id)
            .putString(KEY_PHONE_NUMBER, loginResponse.user.phoneNumber)
            .putString(KEY_DISPLAY_NAME, loginResponse.user.displayName)
            .apply()
    }

    private fun clearSession() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_PHONE_NUMBER)
            .remove(KEY_DISPLAY_NAME)
            .apply()
    }

    private fun getDeviceName(): String {
        return "${Build.MANUFACTURER} ${Build.MODEL}"
    }
}
