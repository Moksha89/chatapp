package com.chatapp.presentation.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.domain.model.Message
import com.chatapp.domain.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class ChatUiState(
    val messages: List<Message> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentUserId: String = ""
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var currentChatId: String = ""

    fun loadMessages(chatId: String, userId: String) {
        currentChatId = chatId
        _uiState.update { it.copy(isLoading = true, currentUserId = userId) }
        
        viewModelScope.launch {
            chatRepository.getMessages(chatId)
                .onSuccess { messages ->
                    _uiState.update { 
                        it.copy(
                            messages = messages.sortedBy { msg -> msg.createdAt },
                            isLoading = false,
                            error = null
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load messages"
                        )
                    }
                }
        }
    }

    fun sendMessage(content: String, replyToMessageId: String? = null) {
        if (content.isBlank() || currentChatId.isEmpty()) return
        
        val tempId = UUID.randomUUID().toString()
        
        viewModelScope.launch {
            chatRepository.sendMessage(currentChatId, content, tempId, replyToMessageId)
                .onSuccess { message ->
                    _uiState.update { state ->
                        state.copy(
                            messages = (state.messages + message).sortedBy { it.createdAt }
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(error = error.message ?: "Failed to send message")
                    }
                }
        }
    }

    fun addReaction(messageId: String, emoji: String) {
        viewModelScope.launch {
            chatRepository.addReaction(currentChatId, messageId, emoji)
                .onSuccess { reactions ->
                    _uiState.update { state ->
                        state.copy(
                            messages = state.messages.map { msg ->
                                if (msg.id == messageId) {
                                    msg.copy(reactions = reactions)
                                } else msg
                            }
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(error = error.message ?: "Failed to add reaction")
                    }
                }
        }
    }

    fun removeReaction(messageId: String, emoji: String) {
        viewModelScope.launch {
            chatRepository.removeReaction(currentChatId, messageId, emoji)
                .onSuccess { reactions ->
                    _uiState.update { state ->
                        state.copy(
                            messages = state.messages.map { msg ->
                                if (msg.id == messageId) {
                                    msg.copy(reactions = reactions)
                                } else msg
                            }
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(error = error.message ?: "Failed to remove reaction")
                    }
                }
        }
    }

    fun toggleReaction(messageId: String, emoji: String) {
        val message = _uiState.value.messages.find { it.id == messageId } ?: return
        val currentUserId = _uiState.value.currentUserId
        val hasReacted = message.reactions[emoji]?.contains(currentUserId) == true
        
        if (hasReacted) {
            removeReaction(messageId, emoji)
        } else {
            addReaction(messageId, emoji)
        }
    }

    fun editMessage(messageId: String, newContent: String) {
        if (newContent.isBlank()) return
        
        viewModelScope.launch {
            chatRepository.editMessage(currentChatId, messageId, newContent)
                .onSuccess { updatedMessage ->
                    _uiState.update { state ->
                        state.copy(
                            messages = state.messages.map { msg ->
                                if (msg.id == messageId) {
                                    msg.copy(
                                        content = updatedMessage.content,
                                        isEdited = true,
                                        editedAt = updatedMessage.editedAt
                                    )
                                } else msg
                            }
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(error = error.message ?: "Failed to edit message")
                    }
                }
        }
    }

    fun deleteMessage(messageId: String, deleteForEveryone: Boolean) {
        viewModelScope.launch {
            chatRepository.deleteMessage(currentChatId, messageId, deleteForEveryone)
                .onSuccess {
                    _uiState.update { state ->
                        if (deleteForEveryone) {
                            // Mark as deleted for everyone
                            state.copy(
                                messages = state.messages.map { msg ->
                                    if (msg.id == messageId) {
                                        msg.copy(isDeleted = true, content = "This message was deleted")
                                    } else msg
                                }
                            )
                        } else {
                            // Remove from local list (delete for me)
                            state.copy(
                                messages = state.messages.filter { it.id != messageId }
                            )
                        }
                    }
                }
                .onFailure { error ->
                    _uiState.update { 
                        it.copy(error = error.message ?: "Failed to delete message")
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
