package com.chatapp.presentation.business

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.UpdateBusinessProfileRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BusinessProfileUiState(
    val businessName: String = "",
    val description: String = "",
    val address: String = "",
    val email: String = "",
    val website: String = "",
    val category: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val saved: Boolean = false
)

@HiltViewModel
class BusinessViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(BusinessProfileUiState())
    val uiState: StateFlow<BusinessProfileUiState> = _uiState.asStateFlow()

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val profile = apiService.getBusinessProfile()
                _uiState.update {
                    it.copy(
                        businessName = profile.businessName ?: "",
                        description = profile.description ?: "",
                        address = profile.address ?: "",
                        email = profile.email ?: "",
                        website = profile.website ?: "",
                        category = profile.category ?: "",
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun saveProfile(
        businessName: String,
        description: String,
        address: String,
        email: String,
        website: String,
        category: String
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                apiService.updateBusinessProfile(
                    UpdateBusinessProfileRequest(
                        businessName = businessName.ifBlank { null },
                        description = description.ifBlank { null },
                        address = address.ifBlank { null },
                        email = email.ifBlank { null },
                        website = website.ifBlank { null },
                        category = category.ifBlank { null }
                    )
                )
                _uiState.update { it.copy(isLoading = false, saved = true) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun clearSaved() {
        _uiState.update { it.copy(saved = false) }
    }
}
