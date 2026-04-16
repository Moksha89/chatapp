package com.chatapp.presentation.friends

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.FriendResponse
import com.chatapp.data.api.dto.FriendRequestResponse
import com.chatapp.data.api.dto.UserResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FriendsUiState(
    val friends: List<FriendResponse> = emptyList(),
    val pendingRequests: List<FriendRequestResponse> = emptyList(),
    val sentRequests: List<FriendRequestResponse> = emptyList(),
    val suggestions: List<UserResponse> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class FriendsViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(FriendsUiState())
    val uiState: StateFlow<FriendsUiState> = _uiState.asStateFlow()

    fun loadFriends() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val friends = apiService.getFriends()
                val pending = apiService.getFriendRequests()
                val suggestions = apiService.getFriendSuggestions()
                _uiState.update {
                    it.copy(
                        friends = friends,
                        pendingRequests = pending,
                        suggestions = suggestions,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun acceptRequest(requestId: String) {
        viewModelScope.launch {
            try {
                apiService.acceptFriendRequest(requestId)
                loadFriends()
            } catch (_: Exception) { }
        }
    }

    fun declineRequest(requestId: String) {
        viewModelScope.launch {
            try {
                apiService.declineFriendRequest(requestId)
                _uiState.update { state ->
                    state.copy(pendingRequests = state.pendingRequests.filter { it.id != requestId })
                }
            } catch (_: Exception) { }
        }
    }

    fun removeFriend(friendshipId: String) {
        viewModelScope.launch {
            try {
                apiService.removeFriend(friendshipId)
                _uiState.update { state ->
                    state.copy(friends = state.friends.filter { it.id != friendshipId })
                }
            } catch (_: Exception) { }
        }
    }
}
