package com.chatapp.presentation.contacts

import android.app.Application
import android.content.ContentResolver
import android.database.Cursor
import android.provider.ContactsContract
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.SyncContactsRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class ContactSyncUiState(
    val contacts: List<ContactUiItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSyncing: Boolean = false,
    val syncCount: Int = 0,
    val lastSyncTime: Long = 0
)

data class DeviceContact(
    val displayName: String,
    val phoneNumber: String
)

@HiltViewModel
class ContactSyncViewModel @Inject constructor(
    application: Application,
    private val apiService: ApiService
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(ContactSyncUiState())
    val uiState: StateFlow<ContactSyncUiState> = _uiState.asStateFlow()

    fun loadContacts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val contacts = apiService.getContacts()
                _uiState.update {
                    it.copy(
                        contacts = contacts.map { c ->
                            ContactUiItem(c.id, c.displayName, c.phoneNumber, c.isRegistered)
                        },
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    /**
     * Read contacts from the device's contact book using ContentResolver.
     * Returns a list of DeviceContact with display name and phone number.
     */
    private suspend fun readDeviceContacts(): List<DeviceContact> = withContext(Dispatchers.IO) {
        val contacts = mutableListOf<DeviceContact>()
        val contentResolver: ContentResolver = getApplication<Application>().contentResolver
        
        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                ),
                null,
                null,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
            )
            
            val seenNumbers = mutableSetOf<String>()
            cursor?.let {
                val nameIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numberIdx = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                
                while (it.moveToNext()) {
                    val name = if (nameIdx >= 0) it.getString(nameIdx) else null
                    val number = if (numberIdx >= 0) it.getString(numberIdx) else null
                    
                    if (!name.isNullOrBlank() && !number.isNullOrBlank()) {
                        // Normalize phone number (remove spaces, dashes, parentheses)
                        val normalized = number.replace(Regex("[\\s\\-()]+"), "")
                        if (normalized.isNotEmpty() && seenNumbers.add(normalized)) {
                            contacts.add(DeviceContact(name, normalized))
                        }
                    }
                }
            }
        } catch (e: SecurityException) {
            // Permission not granted
            throw Exception("Contacts permission required. Please grant access in Settings.")
        } finally {
            cursor?.close()
        }
        
        contacts
    }

    /**
     * Sync device contacts with the server.
     * Reads phone contacts, sends phone numbers to server for matching,
     * and updates the UI with registered/unregistered status.
     */
    fun syncContacts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, error = null) }
            try {
                // Step 1: Read contacts from device
                val deviceContacts = readDeviceContacts()
                
                if (deviceContacts.isEmpty()) {
                    _uiState.update { 
                        it.copy(isSyncing = false, error = "No contacts found on device") 
                    }
                    return@launch
                }
                
                // Step 2: Send phone numbers to server for matching
                val phoneNumbers = deviceContacts.map { it.phoneNumber }
                val syncRequest = SyncContactsRequest(phoneNumbers = phoneNumbers)
                val serverContacts = apiService.syncContacts(syncRequest)
                
                // Step 3: Merge device contacts with server response
                val serverPhoneMap = serverContacts.associateBy { 
                    it.phoneNumber.replace(Regex("[\\s\\-()]+"), "") 
                }
                
                val mergedContacts = deviceContacts.map { dc ->
                    val serverMatch = serverPhoneMap[dc.phoneNumber]
                    ContactUiItem(
                        id = serverMatch?.id ?: "",
                        displayName = dc.displayName,
                        phoneNumber = dc.phoneNumber,
                        isRegistered = serverMatch?.isRegistered ?: false
                    )
                }.sortedWith(compareByDescending<ContactUiItem> { it.isRegistered }
                    .thenBy { it.displayName })
                
                _uiState.update {
                    it.copy(
                        contacts = mergedContacts,
                        isSyncing = false,
                        syncCount = mergedContacts.count { c -> c.isRegistered },
                        lastSyncTime = System.currentTimeMillis()
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isSyncing = false, error = e.message) }
                // Fall back to server-only contacts
                loadContacts()
            }
        }
    }
}
