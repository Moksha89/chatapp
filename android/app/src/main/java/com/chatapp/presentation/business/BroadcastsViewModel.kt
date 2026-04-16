package com.chatapp.presentation.business

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.CreateBroadcastRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BroadcastUiItem(val id: String, val name: String, val recipientCount: Int)

data class BroadcastsUiState(
    val broadcasts: List<BroadcastUiItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class BroadcastsViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(BroadcastsUiState())
    val uiState: StateFlow<BroadcastsUiState> = _uiState.asStateFlow()

    fun loadBroadcasts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val broadcasts = apiService.getBroadcasts()
                _uiState.update {
                    it.copy(
                        broadcasts = broadcasts.map { b ->
                            BroadcastUiItem(b.id, b.name, b.recipientIds?.size ?: 0)
                        },
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun createBroadcast(name: String) {
        viewModelScope.launch {
            try {
                apiService.createBroadcast(CreateBroadcastRequest(name, emptyList()))
                loadBroadcasts()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
}
