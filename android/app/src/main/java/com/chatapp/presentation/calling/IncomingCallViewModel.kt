package com.chatapp.presentation.calling

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.socket.SocketEvent
import com.chatapp.data.socket.SocketManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Global ViewModel that observes incoming call events from SocketManager.
 * Scoped at the navigation level so it persists across screen navigations.
 * When an incoming call arrives, AppNavigation reads this state and navigates
 * to CallScreen automatically.
 */
@HiltViewModel
class IncomingCallViewModel @Inject constructor(
    private val socketManager: SocketManager
) : ViewModel() {

    val incomingCall: StateFlow<SocketEvent.IncomingCall?> = socketManager.incomingCall

    fun clearIncomingCall() {
        socketManager.clearIncomingCall()
    }
}
