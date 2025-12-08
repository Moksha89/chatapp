package com.chatapp.presentation.qr

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.QrPairingRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QrUiState(
    val isLoading: Boolean = false,
    val isPaired: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class QrViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(QrUiState())
    val uiState: StateFlow<QrUiState> = _uiState.asStateFlow()

    suspend fun confirmPairing(pairingCode: String): Result<Boolean> {
        return try {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            val response = apiService.confirmQrPairing(QrPairingRequest(pairingCode = pairingCode))
            
            _uiState.update { 
                it.copy(
                    isLoading = false, 
                    isPaired = response.success,
                    error = if (!response.success) response.message else null
                ) 
            }
            
            if (response.success) {
                Result.success(true)
            } else {
                Result.failure(Exception(response.message))
            }
        } catch (e: Exception) {
            _uiState.update { 
                it.copy(
                    isLoading = false, 
                    error = e.message ?: "Pairing failed"
                ) 
            }
            Result.failure(e)
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun reset() {
        _uiState.update { QrUiState() }
    }
}
