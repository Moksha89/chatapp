package com.chatapp.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.repository.AuthRepositoryImpl
import com.chatapp.data.socket.SocketManager
import com.chatapp.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AuthStep {
    PHONE,
    OTP,
    REGISTER
}

data class AuthUiState(
    val step: AuthStep = AuthStep.PHONE,
    val phoneNumber: String = "",
    val otp: String = "",
    val displayName: String = "",
    val isBusiness: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
    val isExistingUser: Boolean? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepositoryImpl,
    private val socketManager: SocketManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        // Check if already logged in
        if (authRepository.isLoggedIn()) {
            _uiState.update { it.copy(isLoggedIn = true) }
            // Auto-connect socket when already logged in
            socketManager.connect()
        }
    }

    fun updatePhoneNumber(phone: String) {
        _uiState.update { it.copy(phoneNumber = phone, error = null) }
    }

    fun updateOtp(otp: String) {
        _uiState.update { it.copy(otp = otp, error = null) }
    }

    fun updateDisplayName(name: String) {
        _uiState.update { it.copy(displayName = name, error = null) }
    }

    fun updateIsBusiness(isBusiness: Boolean) {
        _uiState.update { it.copy(isBusiness = isBusiness) }
    }

    fun setExistingUser(isExisting: Boolean) {
        _uiState.update { it.copy(isExistingUser = isExisting) }
    }

    fun sendOtp() {
        val phone = _uiState.value.phoneNumber
        if (phone.isBlank()) {
            _uiState.update { it.copy(error = "Please enter a phone number") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            authRepository.sendOtp(phone).fold(
                onSuccess = { devOtp ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false, 
                            step = AuthStep.OTP,
                            error = null
                        ) 
                    }
                },
                onFailure = { e ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false, 
                            error = e.message ?: "Failed to send OTP"
                        ) 
                    }
                }
            )
        }
    }

    fun verifyOtp() {
        val otp = _uiState.value.otp
        if (otp.length != 6) {
            _uiState.update { it.copy(error = "Please enter a 6-digit OTP") }
            return
        }

        // If we know it's an existing user, try login directly
        // Otherwise, go to register step
        val isExisting = _uiState.value.isExistingUser
        if (isExisting == true) {
            login()
        } else if (isExisting == false) {
            _uiState.update { it.copy(step = AuthStep.REGISTER) }
        } else {
            // Try login first, if fails go to register
            tryLoginThenRegister()
        }
    }

    private fun tryLoginThenRegister() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            val deviceId = authRepository.getOrCreateDeviceId()
            
            authRepository.login(
                phoneNumber = _uiState.value.phoneNumber,
                otp = _uiState.value.otp,
                deviceId = deviceId
            ).fold(
                onSuccess = {
                    socketManager.connect()
                    _uiState.update { it.copy(isLoading = false, isLoggedIn = true) }
                },
                onFailure = { e ->
                    // Login failed, might be new user - go to register
                    _uiState.update { 
                        it.copy(
                            isLoading = false, 
                            step = AuthStep.REGISTER,
                            isExistingUser = false,
                            error = null
                        ) 
                    }
                }
            )
        }
    }

    private fun login() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            val deviceId = authRepository.getOrCreateDeviceId()
            
            authRepository.login(
                phoneNumber = _uiState.value.phoneNumber,
                otp = _uiState.value.otp,
                deviceId = deviceId
            ).fold(
                onSuccess = {
                    socketManager.connect()
                    _uiState.update { it.copy(isLoading = false, isLoggedIn = true) }
                },
                onFailure = { e ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false, 
                            error = e.message ?: "Login failed"
                        ) 
                    }
                }
            )
        }
    }

    fun register() {
        val displayName = _uiState.value.displayName
        if (displayName.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your name") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            val deviceId = authRepository.getOrCreateDeviceId()
            
            authRepository.register(
                phoneNumber = _uiState.value.phoneNumber,
                otp = _uiState.value.otp,
                displayName = displayName,
                deviceId = deviceId,
                isBusiness = _uiState.value.isBusiness
            ).fold(
                onSuccess = {
                    socketManager.connect()
                    _uiState.update { it.copy(isLoading = false, isLoggedIn = true) }
                },
                onFailure = { e ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false, 
                            error = e.message ?: "Registration failed"
                        ) 
                    }
                }
            )
        }
    }

    fun goBack() {
        when (_uiState.value.step) {
            AuthStep.OTP -> _uiState.update { 
                it.copy(step = AuthStep.PHONE, otp = "", error = null) 
            }
            AuthStep.REGISTER -> _uiState.update { 
                it.copy(step = AuthStep.OTP, error = null) 
            }
            else -> {}
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
