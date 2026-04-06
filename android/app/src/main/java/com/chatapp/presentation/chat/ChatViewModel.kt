package com.chatapp.presentation.chat

import android.media.RingtoneManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import android.content.Context
import android.net.Uri
import com.chatapp.data.api.ApiService
import com.chatapp.data.socket.SocketEvent
import com.chatapp.data.socket.SocketManager
import com.chatapp.domain.model.Message
import com.chatapp.domain.model.MessageStatus
import com.chatapp.domain.model.MessageType
import com.chatapp.domain.repository.ChatRepository
import com.chatapp.presentation.media.MediaPickerHelper
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
    val currentUserId: String = "",
    val isOnline: Boolean = false,
    val isTyping: Boolean = false
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val socketManager: SocketManager,
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var currentChatId: String = ""
    private var otherUserId: String = ""

    init {
        viewModelScope.launch {
            socketManager.events.collect { event -> handleSocketEvent(event) }
        }
        viewModelScope.launch {
            socketManager.onlineUsers.collect { onlineUsers ->
                if (otherUserId.isNotEmpty()) {
                    _uiState.update { it.copy(isOnline = onlineUsers.contains(otherUserId)) }
                }
            }
        }
        viewModelScope.launch {
            socketManager.typingUsers.collect { typingMap ->
                if (currentChatId.isNotEmpty()) {
                    val typingInChat = typingMap[currentChatId] ?: emptySet()
                    val isTyping = typingInChat.isNotEmpty() && !typingInChat.contains(_uiState.value.currentUserId)
                    _uiState.update { it.copy(isTyping = isTyping) }
                }
            }
        }
    }

    private fun handleSocketEvent(event: SocketEvent) {
        when (event) {
            is SocketEvent.NewMessage -> {
                if (event.chatId == currentChatId) {
                    try {
                        val data = event.messageJson
                        val message = Message(
                            id = data.optString("id", UUID.randomUUID().toString()),
                            chatId = event.chatId,
                            senderId = data.optString("senderId", ""),
                            content = data.optString("content", ""),
                            type = MessageType.TEXT,
                            status = MessageStatus.DELIVERED,
                            createdAt = System.currentTimeMillis(),
                            replyToMessageId = if (data.has("replyToMessageId")) data.optString("replyToMessageId") else null
                        )
                        _uiState.update { state ->
                            if (state.messages.none { it.id == message.id }) {
                                state.copy(messages = (state.messages + message).sortedBy { it.createdAt })
                            } else state
                        }
                        socketManager.markDelivered(message.id)
                    } catch (_: Exception) { }
                }
            }
            is SocketEvent.MessageDelivered -> {
                _uiState.update { state ->
                    state.copy(messages = state.messages.map { msg ->
                        if (msg.id == event.messageId) msg.copy(status = MessageStatus.DELIVERED) else msg
                    })
                }
            }
            is SocketEvent.MessageRead -> {
                _uiState.update { state ->
                    state.copy(messages = state.messages.map { msg ->
                        if (msg.id == event.messageId) msg.copy(status = MessageStatus.READ) else msg
                    })
                }
            }
            is SocketEvent.MessageEdited -> {
                _uiState.update { state ->
                    state.copy(messages = state.messages.map { msg ->
                        if (msg.id == event.messageId) msg.copy(content = event.content, isEdited = true) else msg
                    })
                }
            }
            is SocketEvent.MessageDeleted -> {
                _uiState.update { state ->
                    state.copy(messages = state.messages.map { msg ->
                        if (msg.id == event.messageId) msg.copy(isDeleted = true, content = "This message was deleted") else msg
                    })
                }
            }
            else -> { }
        }
    }

    fun connectSocket() {
        if (!socketManager.isConnected.value) {
            socketManager.connect()
        }
    }

    fun loadMessages(chatId: String, userId: String, otherUserIdParam: String = "") {
        currentChatId = chatId
        otherUserId = otherUserIdParam
        _uiState.update { it.copy(isLoading = true, currentUserId = userId) }
        connectSocket()

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
                    val unreadIds = messages
                        .filter { it.senderId != userId && it.status != MessageStatus.READ }
                        .map { it.id }
                    if (unreadIds.isNotEmpty()) {
                        chatRepository.markMessagesRead(chatId, unreadIds)
                        socketManager.markRead(chatId, unreadIds)
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
        // Send via socket for real-time delivery
        socketManager.sendMessage(currentChatId, content, "text", tempId, replyToMessageId)
        // Also send via HTTP for persistence
        viewModelScope.launch {
            chatRepository.sendMessage(currentChatId, content, tempId, replyToMessageId)
                .onSuccess { message ->
                    _uiState.update { state ->
                        val existing = state.messages.find { it.id == tempId || it.id == message.id }
                        if (existing != null) {
                            state.copy(messages = state.messages.map { msg ->
                                if (msg.id == tempId || msg.id == message.id) message else msg
                            }.sortedBy { it.createdAt })
                        } else {
                            state.copy(messages = (state.messages + message).sortedBy { it.createdAt })
                        }
                    }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message ?: "Failed to send message") }
                }
        }
    }

    fun sendMediaMessage(context: Context, uri: Uri, mediaType: String = "image") {
        if (currentChatId.isEmpty()) return
        viewModelScope.launch {
            val file = MediaPickerHelper.getFileFromUri(context, uri)
            if (file != null) {
                val url = MediaPickerHelper.uploadFile(apiService, file)
                if (url != null) {
                    val messageType = when {
                        mediaType.startsWith("image") -> "image"
                        mediaType.startsWith("video") -> "video"
                        mediaType.startsWith("audio") -> "audio"
                        else -> "file"
                    }
                    sendMessage(url, null)
                    socketManager.sendMessage(currentChatId, url, messageType, UUID.randomUUID().toString(), null)
                } else {
                    _uiState.update { it.copy(error = "Failed to upload file") }
                }
                file.delete()
            } else {
                _uiState.update { it.copy(error = "Failed to read file") }
            }
        }
    }

    fun sendTypingStart() {
        if (currentChatId.isNotEmpty()) socketManager.sendTypingStart(currentChatId)
    }

    fun sendTypingStop() {
        if (currentChatId.isNotEmpty()) socketManager.sendTypingStop(currentChatId)
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

    override fun onCleared() {
        super.onCleared()
        if (currentChatId.isNotEmpty()) {
            socketManager.sendTypingStop(currentChatId)
        }
    }
}
