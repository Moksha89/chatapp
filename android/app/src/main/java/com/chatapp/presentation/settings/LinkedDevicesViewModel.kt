package com.chatapp.presentation.settings

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.DeviceResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LinkedDevice(
    val id: String,
    val deviceId: String,
    val deviceName: String,
    val deviceType: String,
    val isPrimary: Boolean,
    val isActive: Boolean,
    val lastSeen: String?,
    val isCurrentDevice: Boolean = false
)

data class LinkedDevicesUiState(
    val devices: List<LinkedDevice> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isRemoving: Boolean = false,
    val removeSuccess: Boolean = false
)

@HiltViewModel
class LinkedDevicesViewModel @Inject constructor(
    private val apiService: ApiService,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(LinkedDevicesUiState())
    val uiState: StateFlow<LinkedDevicesUiState> = _uiState.asStateFlow()

    private val currentDeviceId: String by lazy {
        val prefs = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
        prefs.getString("device_id", "") ?: ""
    }

    init {
        loadDevices()
    }

    fun loadDevices() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            try {
                val response = apiService.getDevices()
                val devices = response.map { device ->
                    LinkedDevice(
                        id = device.id,
                        deviceId = device.deviceId,
                        deviceName = device.deviceName,
                        deviceType = device.deviceType,
                        isPrimary = device.isPrimary,
                        isActive = device.isActive,
                        lastSeen = device.lastSeen,
                        isCurrentDevice = device.deviceId == currentDeviceId
                    )
                }
                
                _uiState.update { 
                    it.copy(
                        devices = devices,
                        isLoading = false,
                        error = null
                    ) 
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load devices"
                    ) 
                }
            }
        }
    }

    fun removeDevice(deviceId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isRemoving = true, error = null) }
            
            try {
                apiService.removeDevice(deviceId)
                
                _uiState.update { state ->
                    state.copy(
                        devices = state.devices.filter { it.id != deviceId },
                        isRemoving = false,
                        removeSuccess = true
                    )
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isRemoving = false,
                        error = e.message ?: "Failed to remove device"
                    ) 
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearRemoveSuccess() {
        _uiState.update { it.copy(removeSuccess = false) }
    }
}
