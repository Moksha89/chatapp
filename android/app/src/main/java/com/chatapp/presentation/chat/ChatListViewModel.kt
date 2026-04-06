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

data class ChatLabel(
    val id: String,
    val name: String,
    val color: Long = 0xFF246BFD
)

data class ChatSummary(
    val id: String,
    val name: String,
    val lastMessage: String,
    val lastMessageTime: String,
    val unreadCount: Int = 0,
    val type: String = "direct",
    val isPinned: Boolean = false,
    val isMuted: Boolean = false,
    val isArchived: Boolean = false,
    val isBlocked: Boolean = false,
    val labels: List<String> = emptyList()
)

data class ChatListUiState(
    val chats: List<ChatSummary> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentUserId: String = "",
    val currentUserName: String = "",
    val currentPhoneNumber: String = "",
    val labels: List<ChatLabel> = listOf(
        ChatLabel("1", "New Customer", 0xFF4CAF50),
        ChatLabel("2", "VIP", 0xFFFF9800),
        ChatLabel("3", "Follow Up", 0xFF2196F3),
        ChatLabel("4", "Urgent", 0xFFF44336),
        ChatLabel("5", "Payment Pending", 0xFF9C27B0)
    ),
    val pinnedChatIds: Set<String> = emptySet(),
    val mutedChatIds: Set<String> = emptySet(),
    val archivedChatIds: Set<String> = emptySet(),
    val blockedChatIds: Set<String> = emptySet(),
    val chatLabels: Map<String, List<String>> = emptyMap()
)

@HiltViewModel
class ChatListViewModel @Inject constructor(
    private val apiService: ApiService,
    private val authRepository: AuthRepositoryImpl
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatListUiState())
    val uiState: StateFlow<ChatListUiState> = _uiState.asStateFlow()

    init {
        loadCurrentUser()
        loadChats()
    }

    private fun loadCurrentUser() {
        val userId = authRepository.getCurrentUserId()
        val userName = authRepository.getCurrentUserName()
        val phoneNumber = authRepository.getCurrentPhoneNumber()
        _uiState.update {
            it.copy(
                currentUserId = userId,
                currentUserName = userName,
                currentPhoneNumber = phoneNumber
            )
        }
        // Also fetch fresh user data from server
        viewModelScope.launch {
            try {
                val user = apiService.getCurrentUser()
                _uiState.update {
                    it.copy(
                        currentUserId = user.id,
                        currentUserName = user.displayName,
                        currentPhoneNumber = user.phoneNumber
                    )
                }
            } catch (_: Exception) { }
        }
    }

    fun loadChats() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            try {
                val currentId = _uiState.value.currentUserId
                val response = apiService.getChats()
                val pinnedIds = _uiState.value.pinnedChatIds
                val mutedIds = _uiState.value.mutedChatIds
                val archivedIds = _uiState.value.archivedChatIds
                val blockedIds = _uiState.value.blockedChatIds
                val labelMap = _uiState.value.chatLabels

                val chats = response.map { chat ->
                    // For direct chats, show the OTHER participant's name (not current user)
                    val chatName = chat.name ?: chat.participants
                        .filter { it.userId != currentId && it.user != null }
                        .firstOrNull()?.user?.displayName
                        ?: chat.participants.firstOrNull { it.user != null }?.user?.displayName
                        ?: "Unknown"
                    
                    ChatSummary(
                        id = chat.id,
                        name = chatName,
                        lastMessage = chat.lastMessage?.content ?: "No messages yet",
                        lastMessageTime = formatTime(chat.lastMessage?.createdAt),
                        unreadCount = chat.unreadCount,
                        type = chat.type,
                        isPinned = pinnedIds.contains(chat.id),
                        isMuted = mutedIds.contains(chat.id),
                        isArchived = archivedIds.contains(chat.id),
                        isBlocked = blockedIds.contains(chat.id),
                        labels = labelMap[chat.id] ?: emptyList()
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

    fun togglePin(chatId: String) {
        _uiState.update { state ->
            val newPinned = state.pinnedChatIds.toMutableSet()
            if (newPinned.contains(chatId)) newPinned.remove(chatId) else newPinned.add(chatId)
            val updatedChats = state.chats.map { 
                if (it.id == chatId) it.copy(isPinned = newPinned.contains(chatId)) else it 
            }
            state.copy(pinnedChatIds = newPinned, chats = updatedChats)
        }
    }

    fun toggleMute(chatId: String) {
        _uiState.update { state ->
            val newMuted = state.mutedChatIds.toMutableSet()
            if (newMuted.contains(chatId)) newMuted.remove(chatId) else newMuted.add(chatId)
            val updatedChats = state.chats.map { 
                if (it.id == chatId) it.copy(isMuted = newMuted.contains(chatId)) else it 
            }
            state.copy(mutedChatIds = newMuted, chats = updatedChats)
        }
    }

    fun toggleArchive(chatId: String) {
        _uiState.update { state ->
            val newArchived = state.archivedChatIds.toMutableSet()
            if (newArchived.contains(chatId)) newArchived.remove(chatId) else newArchived.add(chatId)
            val updatedChats = state.chats.map { 
                if (it.id == chatId) it.copy(isArchived = newArchived.contains(chatId)) else it 
            }
            state.copy(archivedChatIds = newArchived, chats = updatedChats)
        }
    }

    fun toggleBlock(chatId: String) {
        _uiState.update { state ->
            val newBlocked = state.blockedChatIds.toMutableSet()
            if (newBlocked.contains(chatId)) newBlocked.remove(chatId) else newBlocked.add(chatId)
            val updatedChats = state.chats.map { 
                if (it.id == chatId) it.copy(isBlocked = newBlocked.contains(chatId)) else it 
            }
            state.copy(blockedChatIds = newBlocked, chats = updatedChats)
        }
    }

    fun addLabelToChat(chatId: String, labelId: String) {
        _uiState.update { state ->
            val currentLabels = state.chatLabels.toMutableMap()
            val chatLabelList = (currentLabels[chatId] ?: emptyList()).toMutableList()
            if (!chatLabelList.contains(labelId)) chatLabelList.add(labelId)
            currentLabels[chatId] = chatLabelList
            val updatedChats = state.chats.map { 
                if (it.id == chatId) it.copy(labels = chatLabelList) else it 
            }
            state.copy(chatLabels = currentLabels, chats = updatedChats)
        }
    }

    fun removeLabelFromChat(chatId: String, labelId: String) {
        _uiState.update { state ->
            val currentLabels = state.chatLabels.toMutableMap()
            val chatLabelList = (currentLabels[chatId] ?: emptyList()).toMutableList()
            chatLabelList.remove(labelId)
            currentLabels[chatId] = chatLabelList
            val updatedChats = state.chats.map { 
                if (it.id == chatId) it.copy(labels = chatLabelList) else it 
            }
            state.copy(chatLabels = currentLabels, chats = updatedChats)
        }
    }

    fun createLabel(name: String, color: Long = 0xFF246BFD) {
        _uiState.update { state ->
            val newId = (state.labels.size + 1).toString()
            val newLabel = ChatLabel(newId, name, color)
            state.copy(labels = state.labels + newLabel)
        }
    }

    fun deleteChat(chatId: String) {
        _uiState.update { state ->
            state.copy(chats = state.chats.filter { it.id != chatId })
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
