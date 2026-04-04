package com.chatapp.presentation.business

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.CreateLabelRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LabelUiItem(val id: String, val name: String, val color: String)

data class LabelsUiState(
    val labels: List<LabelUiItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class LabelsViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(LabelsUiState())
    val uiState: StateFlow<LabelsUiState> = _uiState.asStateFlow()

    fun loadLabels() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val labels = apiService.getLabels()
                _uiState.update {
                    it.copy(labels = labels.map { l -> LabelUiItem(l.id, l.name, l.color) }, isLoading = false)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun addLabel(name: String, color: String) {
        viewModelScope.launch {
            try {
                apiService.createLabel(CreateLabelRequest(name, color))
                loadLabels()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun deleteLabel(id: String) {
        viewModelScope.launch {
            try {
                apiService.deleteLabel(id)
                loadLabels()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
}
