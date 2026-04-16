package com.chatapp.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.domain.repository.BlockedUserInfo
import com.chatapp.domain.repository.PrivacyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PrivacyUiState(
    val readReceiptsEnabled: Boolean = true,
    val blockedUsers: List<BlockedUserInfo> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class PrivacyViewModel @Inject constructor(
    private val privacyRepository: PrivacyRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PrivacyUiState())
    val uiState: StateFlow<PrivacyUiState> = _uiState.asStateFlow()

    init {
        loadPrivacySettings()
    }

    fun loadPrivacySettings() {
        _uiState.update { it.copy(isLoading = true) }
        
        viewModelScope.launch {
            privacyRepository.getPrivacySettings()
                .onSuccess { settings ->
                    _uiState.update { 
                        it.copy(
                            readReceiptsEnabled = settings.readReceiptsEnabled,
                            blockedUsers = settings.blockedUsers,
                            isLoading = false,
                            error = null
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load privacy settings"
                        )
                    }
                }
        }
    }

    fun toggleReadReceipts(enabled: Boolean) {
        viewModelScope.launch {
            privacyRepository.updateReadReceipts(enabled)
                .onSuccess { settings ->
                    _uiState.update { 
                        it.copy(
                            readReceiptsEnabled = settings.readReceiptsEnabled,
                            error = null
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(error = error.message ?: "Failed to update read receipts")
                    }
                }
        }
    }

    fun unblockUser(userId: String) {
        viewModelScope.launch {
            privacyRepository.unblockUser(userId)
                .onSuccess {
                    _uiState.update { state ->
                        state.copy(
                            blockedUsers = state.blockedUsers.filter { it.id != userId },
                            error = null
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(error = error.message ?: "Failed to unblock user")
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
