package com.chatapp.presentation.business

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.CreateAutoReplyRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AutoReplyUiItem(val id: String, val trigger: String, val response: String)

data class AutoRepliesUiState(
    val autoReplies: List<AutoReplyUiItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class AutoRepliesViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(AutoRepliesUiState())
    val uiState: StateFlow<AutoRepliesUiState> = _uiState.asStateFlow()

    fun loadAutoReplies() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val replies = apiService.getAutoReplies()
                _uiState.update {
                    it.copy(
                        autoReplies = replies.map { r -> AutoReplyUiItem(r.id, r.trigger, r.response) },
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun addAutoReply(trigger: String, response: String) {
        viewModelScope.launch {
            try {
                apiService.createAutoReply(CreateAutoReplyRequest(trigger, response))
                loadAutoReplies()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun deleteAutoReply(id: String) {
        viewModelScope.launch {
            try {
                apiService.deleteAutoReply(id)
                loadAutoReplies()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
}
