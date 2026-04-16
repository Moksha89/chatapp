package com.chatapp.presentation.status

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.StatusResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StatusUiState(
    val myStatuses: List<StatusResponse> = emptyList(),
    val contactStatuses: List<StatusResponse> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class StatusViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(StatusUiState())
    val uiState: StateFlow<StatusUiState> = _uiState.asStateFlow()

    fun loadStatuses() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val myStatuses = apiService.getMyStatuses()
                val contactStatuses = apiService.getContactStatuses()
                _uiState.update {
                    it.copy(
                        myStatuses = myStatuses,
                        contactStatuses = contactStatuses,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun viewStatus(statusId: String) {
        viewModelScope.launch {
            try {
                apiService.viewStatus(statusId)
            } catch (_: Exception) { }
        }
    }

    fun deleteStatus(statusId: String) {
        viewModelScope.launch {
            try {
                apiService.deleteStatus(statusId)
                _uiState.update { state ->
                    state.copy(myStatuses = state.myStatuses.filter { it.id != statusId })
                }
            } catch (_: Exception) { }
        }
    }
}
