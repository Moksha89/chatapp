package com.chatapp.presentation.contacts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ContactSyncUiState(
    val contacts: List<ContactUiItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSyncing: Boolean = false
)

@HiltViewModel
class ContactSyncViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(ContactSyncUiState())
    val uiState: StateFlow<ContactSyncUiState> = _uiState.asStateFlow()

    fun loadContacts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val contacts = apiService.getContacts()
                _uiState.update {
                    it.copy(
                        contacts = contacts.map { c ->
                            ContactUiItem(c.id, c.displayName, c.phoneNumber, c.isRegistered)
                        },
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun syncContacts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true) }
            try {
                // In a real app, we'd read the phone's contact list here
                // For now, just reload from the server
                loadContacts()
                _uiState.update { it.copy(isSyncing = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isSyncing = false, error = e.message) }
            }
        }
    }
}
