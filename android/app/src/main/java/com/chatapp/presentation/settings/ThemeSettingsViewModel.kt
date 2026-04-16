package com.chatapp.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.UpdateThemeSettingsRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ThemeSettingsUiState(
    val currentTheme: String = "system",
    val currentFontSize: String = "medium",
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ThemeSettingsViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(ThemeSettingsUiState())
    val uiState: StateFlow<ThemeSettingsUiState> = _uiState.asStateFlow()

    fun loadSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val settings = apiService.getThemeSettings()
                _uiState.update {
                    it.copy(
                        currentTheme = settings.theme,
                        currentFontSize = settings.fontSize,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun updateTheme(theme: String) {
        viewModelScope.launch {
            try {
                apiService.updateThemeSettings(UpdateThemeSettingsRequest(theme = theme))
                _uiState.update { it.copy(currentTheme = theme) }
            } catch (_: Exception) { }
        }
    }

    fun updateFontSize(fontSize: String) {
        viewModelScope.launch {
            try {
                apiService.updateThemeSettings(UpdateThemeSettingsRequest(fontSize = fontSize))
                _uiState.update { it.copy(currentFontSize = fontSize) }
            } catch (_: Exception) { }
        }
    }
}
