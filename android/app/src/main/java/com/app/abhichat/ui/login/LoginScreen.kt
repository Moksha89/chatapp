package com.app.abhichat.ui.login

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.app.abhichat.data.api.ApiService
import com.app.abhichat.data.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val apiService: ApiService,
    private val prefs: android.content.SharedPreferences
) : ViewModel() {

    private val _step = MutableStateFlow("phone") // phone, otp, name
    val step = _step.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading = _loading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error = _error.asStateFlow()

    private var fullPhone = ""
    private var storedOtp = ""

    fun sendOtp(countryCode: String, phone: String) {
        fullPhone = "$countryCode${phone.replace(Regex("\\D"), "")}"
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                apiService.sendOtp(SendOtpRequest(fullPhone))
                _step.value = "otp"
            } catch (e: Exception) {
                _error.value = e.message ?: "Failed to send OTP"
            } finally {
                _loading.value = false
            }
        }
    }

    fun verifyOtp(otp: String, onSuccess: () -> Unit) {
        storedOtp = otp
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                val result = apiService.verifyOtp(VerifyOtpRequest(fullPhone, otp))
                if (result.user.isNewUser || result.user.displayName == null || result.user.displayName == result.user.phone) {
                    saveAuth(result)
                    _step.value = "name"
                } else {
                    saveAuth(result)
                    onSuccess()
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Invalid OTP"
            } finally {
                _loading.value = false
            }
        }
    }

    fun register(displayName: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                val result = apiService.register(RegisterRequest(fullPhone, storedOtp, displayName))
                saveAuth(result)
                onSuccess()
            } catch (e: Exception) {
                _error.value = e.message ?: "Registration failed"
            } finally {
                _loading.value = false
            }
        }
    }

    private fun saveAuth(result: AuthResponse) {
        prefs.edit()
            .putString("access_token", result.token)
            .putString("refresh_token", result.refreshToken)
            .putString("user_id", result.user.id)
            .putString("user_name", result.user.displayName ?: result.user.phone)
            .putString("user_phone", result.user.phone)
            .apply()

        // Register FCM token with backend for push notifications
        registerFcmToken()
    }

    private fun registerFcmToken() {
        viewModelScope.launch {
            try {
                val fcmToken = FirebaseMessaging.getInstance().token.await()
                prefs.edit().putString("fcm_token", fcmToken).apply()
                apiService.registerDevice(RegisterDeviceRequest(fcmToken, "ANDROID"))
            } catch (e: Exception) {
                // Non-fatal: push notifications won't work but app still functions
                e.printStackTrace()
            }
        }
    }
}

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val step by viewModel.step.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val error by viewModel.error.collectAsState()

    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    val countryCode = "+91"

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.primary,
                        Color(0xFF1A56DB)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Logo
            Surface(
                modifier = Modifier.size(80.dp),
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                shadowElevation = 8.dp
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Chat,
                        contentDescription = null,
                        modifier = Modifier.size(40.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Text("Abhi Chat", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text("Stay Connected, Stay Chatting", color = Color.White.copy(alpha = 0.8f), fontSize = 14.sp)
            Spacer(modifier = Modifier.height(32.dp))

            // Card
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                color = Color.White,
                shadowElevation = 8.dp
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    when (step) {
                        "phone" -> {
                            Text("Welcome", fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                            Text("Enter your phone number", color = Color.Gray, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(20.dp))

                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it.filter { c -> c.isDigit() } },
                                label = { Text("Phone Number") },
                                prefix = { Text("$countryCode ") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true
                            )

                            if (error != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(error!!, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = { viewModel.sendOtp(countryCode, phone) },
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                enabled = phone.isNotEmpty() && !loading
                            ) {
                                if (loading) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                } else {
                                    Text("Continue")
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
                                }
                            }
                        }

                        "otp" -> {
                            Text("Verify OTP", fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                            Text("Enter the 6-digit code", color = Color.Gray, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(20.dp))

                            OutlinedTextField(
                                value = otp,
                                onValueChange = { if (it.length <= 6) otp = it.filter { c -> c.isDigit() } },
                                label = { Text("OTP Code") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true
                            )

                            if (error != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(error!!, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = { viewModel.verifyOtp(otp, onLoginSuccess) },
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                enabled = otp.length == 6 && !loading
                            ) {
                                if (loading) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                } else {
                                    Text("Verify")
                                }
                            }
                        }

                        "name" -> {
                            Text("Set up your profile", fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                            Text("Enter your display name", color = Color.Gray, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(20.dp))

                            OutlinedTextField(
                                value = displayName,
                                onValueChange = { if (it.length <= 50) displayName = it },
                                label = { Text("Your Name") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true
                            )

                            if (error != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(error!!, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = { viewModel.register(displayName, onLoginSuccess) },
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                shape = RoundedCornerShape(12.dp),
                                enabled = displayName.isNotBlank() && !loading
                            ) {
                                if (loading) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                                } else {
                                    Text("Get Started")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
