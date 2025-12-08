package com.chatapp.presentation.contacts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.CreateChatRequest
import com.chatapp.data.api.dto.SearchUsersRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class Contact(
    val id: String,
    val displayName: String,
    val phoneNumber: String
)

data class NewChatUiState(
    val contacts: List<Contact> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val createdChatId: String? = null
)

@HiltViewModel
class NewChatViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(NewChatUiState())
    val uiState: StateFlow<NewChatUiState> = _uiState.asStateFlow()

    fun searchUsers(phoneNumber: String) {
        if (phoneNumber.isBlank()) {
            _uiState.update { it.copy(contacts = emptyList()) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            try {
                val response = apiService.searchUsers(SearchUsersRequest(phoneNumber = phoneNumber))
                val contacts = response.map { user ->
                    Contact(
                        id = user.id,
                        displayName = user.displayName,
                        phoneNumber = user.phoneNumber
                    )
                }
                
                _uiState.update { 
                    it.copy(
                        contacts = contacts,
                        isLoading = false,
                        error = null
                    ) 
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to search users"
                    ) 
                }
            }
        }
    }

    fun createChat(userId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            try {
                val response = apiService.createChat(CreateChatRequest(participantId = userId))
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        createdChatId = response.id
                    ) 
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to create chat"
                    ) 
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearCreatedChatId() {
        _uiState.update { it.copy(createdChatId = null) }
    }
}
