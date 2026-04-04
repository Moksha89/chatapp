package com.chatapp.presentation.business

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.CreateQuickReplyRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QuickReplyUiItem(val id: String, val shortcut: String, val message: String)

data class QuickRepliesUiState(
    val quickReplies: List<QuickReplyUiItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class QuickRepliesViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(QuickRepliesUiState())
    val uiState: StateFlow<QuickRepliesUiState> = _uiState.asStateFlow()

    fun loadQuickReplies() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val replies = apiService.getQuickReplies()
                _uiState.update {
                    it.copy(quickReplies = replies.map { r -> QuickReplyUiItem(r.id, r.shortcut, r.message) }, isLoading = false)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun addQuickReply(shortcut: String, message: String) {
        viewModelScope.launch {
            try {
                apiService.createQuickReply(CreateQuickReplyRequest(shortcut, message))
                loadQuickReplies()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun deleteQuickReply(id: String) {
        viewModelScope.launch {
            try {
                apiService.deleteQuickReply(id)
                loadQuickReplies()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
}
