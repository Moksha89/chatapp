package com.chatapp.presentation.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.CountryStatResponse
import com.chatapp.data.api.dto.PendingApprovalItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AdminPanelUiState(
    val countryStats: List<CountryStatResponse> = emptyList(),
    val pendingApprovals: List<PendingApprovalItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class AdminPanelViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(AdminPanelUiState())
    val uiState: StateFlow<AdminPanelUiState> = _uiState.asStateFlow()

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val stats = apiService.getCountryStats()
                val approvals = apiService.getPendingApprovals()
                _uiState.update {
                    it.copy(
                        countryStats = stats,
                        pendingApprovals = approvals.approvals,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun approveUser(userId: String) {
        viewModelScope.launch {
            try {
                apiService.approveUser(userId)
                _uiState.update { state ->
                    state.copy(pendingApprovals = state.pendingApprovals.filter { it.userId != userId })
                }
            } catch (_: Exception) { }
        }
    }

    fun rejectUser(userId: String) {
        viewModelScope.launch {
            try {
                apiService.rejectUser(userId)
                _uiState.update { state ->
                    state.copy(pendingApprovals = state.pendingApprovals.filter { it.userId != userId })
                }
            } catch (_: Exception) { }
        }
    }
}
