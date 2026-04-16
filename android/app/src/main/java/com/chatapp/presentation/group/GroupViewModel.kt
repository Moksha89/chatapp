package com.chatapp.presentation.group

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.CreateGroupChatRequest
import com.chatapp.data.api.dto.UserResponse
import com.chatapp.data.api.dto.SearchUsersRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ContactItem(
    val id: String,
    val displayName: String,
    val phoneNumber: String,
    val profilePhoto: String? = null
)

data class GroupUiState(
    val contacts: List<ContactItem> = emptyList(),
    val selectedParticipants: List<ContactItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val createdChatId: String? = null
)

@HiltViewModel
class GroupViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(GroupUiState())
    val uiState: StateFlow<GroupUiState> = _uiState.asStateFlow()

    fun loadContacts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val contacts = apiService.getContacts()
                _uiState.update {
                    it.copy(
                        contacts = contacts.map { c ->
                            ContactItem(c.id, c.displayName, c.phoneNumber, c.profilePhoto)
                        },
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun searchContacts(query: String) {
        if (query.isBlank()) {
            loadContacts()
            return
        }
        viewModelScope.launch {
            try {
                val results = apiService.searchUsers(SearchUsersRequest(query))
                _uiState.update {
                    it.copy(contacts = results.map { u ->
                        ContactItem(u.id, u.displayName, u.phoneNumber, u.profilePhoto)
                    })
                }
            } catch (_: Exception) { }
        }
    }

    fun toggleParticipant(contact: ContactItem) {
        _uiState.update { state ->
            val current = state.selectedParticipants.toMutableList()
            if (current.any { it.id == contact.id }) {
                current.removeAll { it.id == contact.id }
            } else {
                current.add(contact)
            }
            state.copy(selectedParticipants = current)
        }
    }

    fun createGroup(name: String, type: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val response = apiService.createGroupChat(
                    CreateGroupChatRequest(
                        type = type,
                        name = name,
                        participantIds = _uiState.value.selectedParticipants.map { it.id }
                    )
                )
                _uiState.update { it.copy(createdChatId = response.id, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}
