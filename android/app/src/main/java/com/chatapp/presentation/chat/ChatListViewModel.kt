package com.chatapp.presentation.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.repository.AuthRepositoryImpl
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatSummary(
    val id: String,
    val name: String,
    val lastMessage: String,
    val lastMessageTime: String,
    val unreadCount: Int = 0
)

data class ChatListUiState(
    val chats: List<ChatSummary> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ChatListViewModel @Inject constructor(
    private val apiService: ApiService,
    private val authRepository: AuthRepositoryImpl
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatListUiState())
    val uiState: StateFlow<ChatListUiState> = _uiState.asStateFlow()

    init {
        loadChats()
    }

    fun loadChats() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            try {
                val response = apiService.getChats()
                val chats = response.map { chat ->
                    // Get the other participant's name for direct chats
                    val chatName = chat.name ?: chat.participants
                        .firstOrNull { it.user != null }
                        ?.user?.displayName ?: "Unknown"
                    
                    ChatSummary(
                        id = chat.id,
                        name = chatName,
                        lastMessage = chat.lastMessage?.content ?: "No messages yet",
                        lastMessageTime = formatTime(chat.lastMessage?.createdAt),
                        unreadCount = chat.unreadCount
                    )
                }
                
                _uiState.update { 
                    it.copy(
                        chats = chats,
                        isLoading = false,
                        error = null
                    ) 
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load chats"
                    ) 
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun formatTime(isoTime: String?): String {
        if (isoTime == null) return ""
        
        return try {
            // Simple time formatting - just show time or date
            val parts = isoTime.split("T")
            if (parts.size >= 2) {
                val timePart = parts[1].split(":").take(2).joinToString(":")
                timePart
            } else {
                isoTime
            }
        } catch (e: Exception) {
            isoTime
        }
    }
}
