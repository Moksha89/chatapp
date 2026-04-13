package com.chatapp.data.auth

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * App-wide event bus for authentication state changes.
 * When token refresh fails, this emits a SessionExpired event
 * so the navigation layer can redirect to the login screen.
 */
object AuthEventBus {
    private val _events = MutableSharedFlow<AuthEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<AuthEvent> = _events.asSharedFlow()

    fun emitSessionExpired() {
        _events.tryEmit(AuthEvent.SessionExpired)
    }
}

sealed class AuthEvent {
    object SessionExpired : AuthEvent()
}
