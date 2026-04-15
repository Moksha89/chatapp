package com.chatapp.presentation.calling

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.socket.SocketManager
import com.chatapp.data.socket.SocketEvent
import com.chatapp.data.webrtc.WebRTCClient
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.webrtc.IceCandidate
import org.webrtc.MediaStream
import org.webrtc.PeerConnection
import org.webrtc.SessionDescription
import javax.inject.Inject

enum class CallState {
    IDLE, CALLING, INCOMING, CONNECTED, ENDED, RECONNECTING
}

data class CallUiState(
    val callState: CallState = CallState.IDLE,
    val callId: String = "",
    val peerId: String = "",
    val peerName: String = "",
    val callType: String = "voice",
    val isOutgoing: Boolean = true,
    val isMuted: Boolean = false,
    val isSpeaker: Boolean = false,
    val isVideoEnabled: Boolean = true,
    val callDuration: Int = 0,
    val hasNetwork: Boolean = true,
    val errorMessage: String? = null
)

@HiltViewModel
class CallViewModel @Inject constructor(
    private val socketManager: SocketManager,
    private val webRTCClient: WebRTCClient
) : ViewModel() {

    companion object {
        private const val TAG = "CallViewModel"
        private const val CALL_TIMEOUT_MS = 45000L // 45 second timeout matching web app
    }

    private val _uiState = MutableStateFlow(CallUiState())
    val uiState: StateFlow<CallUiState> = _uiState.asStateFlow()

    private var callTimerJob: Job? = null
    private var callTimeoutJob: Job? = null
    private var pendingOffer: SessionDescription? = null
    private val iceCandidateQueue = mutableListOf<Pair<String, IceCandidate>>()

    init {
        // Check if there's a pending incoming call from global navigation
        // (SocketManager stores it when the event arrives before CallScreen is open)
        consumePendingIncomingCall()
        observeSocketEvents()
        setupWebRTCListener()
        // Register callback to receive callId from server acknowledgement
        socketManager.setCallIdCallback { callId ->
            onCallIdReceived(callId)
        }
    }

    /**
     * When AppNavigation detects an incoming call and navigates to CallScreen,
     * the SharedFlow event may already have been consumed. This method reads
     * the pending incoming call from SocketManager's StateFlow and processes it.
     */
    private fun consumePendingIncomingCall() {
        val pending = socketManager.incomingCall.value ?: return
        Log.d(TAG, "Consuming pending incoming call from ${pending.callerName}")
        socketManager.clearIncomingCall()
        handleIncomingCall(pending)
    }

    private fun setupWebRTCListener() {
        webRTCClient.listener = object : WebRTCClient.WebRTCListener {
            override fun onIceCandidate(candidate: IceCandidate) {
                val currentCallId = _uiState.value.callId
                val targetUserId = _uiState.value.peerId
                if (currentCallId.isEmpty()) {
                    // Queue ICE candidates until callId is assigned
                    Log.d(TAG, "Queuing ICE candidate (no callId yet)")
                    iceCandidateQueue.add(targetUserId to candidate)
                    return
                }
                sendIceCandidate(currentCallId, targetUserId, candidate)
            }

            override fun onConnectionStateChange(state: PeerConnection.PeerConnectionState) {
                Log.d(TAG, "Connection state changed: $state")
                when (state) {
                    PeerConnection.PeerConnectionState.CONNECTED -> {
                        _uiState.update { it.copy(callState = CallState.CONNECTED) }
                        cancelCallTimeout()
                        startCallTimer()
                    }
                    PeerConnection.PeerConnectionState.DISCONNECTED -> {
                        // Only reconnect if was connected, not during calling state
                        if (_uiState.value.callState == CallState.CONNECTED) {
                            _uiState.update { it.copy(callState = CallState.RECONNECTING) }
                        }
                    }
                    PeerConnection.PeerConnectionState.FAILED -> {
                        // During 'calling' state, ICE may fail because peer is offline
                        // Let timeout handle it (matching web app fix)
                        if (_uiState.value.callState == CallState.CONNECTED) {
                            _uiState.update { it.copy(callState = CallState.RECONNECTING) }
                        }
                    }
                    PeerConnection.PeerConnectionState.CLOSED -> {
                        // Connection closed
                    }
                    else -> {}
                }
            }

            override fun onRemoteStream(stream: MediaStream) {
                Log.d(TAG, "Remote stream received with ${stream.audioTracks.size} audio, ${stream.videoTracks.size} video tracks")
            }

            override fun onIceGatheringComplete() {
                Log.d(TAG, "ICE gathering complete")
            }
        }
    }

    private fun observeSocketEvents() {
        viewModelScope.launch {
            socketManager.events.collect { event ->
                when (event) {
                    is SocketEvent.IncomingCall -> handleIncomingCall(event)
                    is SocketEvent.CallAnswered -> handleCallAnswered(event)
                    is SocketEvent.CallRejected -> handleCallRejected(event)
                    is SocketEvent.CallEnded -> handleCallEnded(event)
                    is SocketEvent.IceCandidateReceived -> handleIceCandidate(event)
                    else -> {}
                }
            }
        }
    }

    fun initiateCall(targetUserId: String, targetUserName: String, callType: String, chatId: String) {
        Log.d(TAG, "Initiating call to $targetUserName ($targetUserId), type=$callType")

        _uiState.update {
            it.copy(
                callState = CallState.CALLING,
                callId = "",
                peerId = targetUserId,
                peerName = targetUserName,
                callType = callType,
                isOutgoing = true,
                isMuted = false,
                isSpeaker = callType == "video",
                isVideoEnabled = callType == "video",
                callDuration = 0,
                errorMessage = null
            )
        }

        iceCandidateQueue.clear()

        webRTCClient.initialize()
        webRTCClient.createPeerConnection()
        webRTCClient.startLocalAudio()

        if (callType == "video") {
            webRTCClient.startLocalVideo()
        }

        // Set outgoing call timeout (45 seconds) — matching web app
        startCallTimeout(targetUserId, targetUserName, callType)

        webRTCClient.createOffer { sdp ->
            Log.d(TAG, "Offer created, emitting call:initiate")
            socketManager.initiateCall(chatId, targetUserId, callType, sdp)
        }
    }

    fun answerCall() {
        val state = _uiState.value
        val offer = pendingOffer ?: return
        Log.d(TAG, "Answering call from ${state.peerName}")

        webRTCClient.initialize()
        webRTCClient.createPeerConnection()
        webRTCClient.startLocalAudio()

        if (state.callType == "video") {
            webRTCClient.startLocalVideo()
        }

        webRTCClient.setRemoteDescription(offer) {
            webRTCClient.createAnswer { answerSdp ->
                Log.d(TAG, "Answer created, emitting call:answer")
                socketManager.answerCall(state.callId, state.peerId, answerSdp)
            }
        }

        pendingOffer = null
    }

    fun rejectCall() {
        val state = _uiState.value
        Log.d(TAG, "Rejecting call from ${state.peerName}")

        socketManager.rejectCall(state.callId, state.peerId)
        cleanup()
    }

    fun endCall() {
        val state = _uiState.value
        Log.d(TAG, "Ending call with ${state.peerName}")

        if (state.callId.isNotEmpty()) {
            socketManager.endCall(state.callId, state.peerId)
        }
        cleanup()
    }

    fun toggleMute() {
        webRTCClient.toggleMute()
        _uiState.update { it.copy(isMuted = !it.isMuted) }
    }

    fun toggleSpeaker() {
        _uiState.update { it.copy(isSpeaker = !it.isSpeaker) }
    }

    fun toggleVideo() {
        webRTCClient.toggleVideo()
        _uiState.update { it.copy(isVideoEnabled = !it.isVideoEnabled) }
    }

    fun switchCamera() {
        webRTCClient.switchCamera()
    }

    private fun startCallTimeout(targetUserId: String, targetUserName: String, callType: String) {
        cancelCallTimeout()
        callTimeoutJob = viewModelScope.launch {
            delay(CALL_TIMEOUT_MS)
            if (_uiState.value.callState == CallState.CALLING) {
                Log.d(TAG, "Outgoing call timed out after ${CALL_TIMEOUT_MS / 1000}s")
                val endCallId = _uiState.value.callId
                if (endCallId.isNotEmpty()) {
                    socketManager.endCall(endCallId, targetUserId)
                }
                cleanup()
            }
        }
    }

    private fun cancelCallTimeout() {
        callTimeoutJob?.cancel()
        callTimeoutJob = null
    }

    private fun startCallTimer() {
        callTimerJob?.cancel()
        callTimerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.update { it.copy(callDuration = it.callDuration + 1) }
            }
        }
    }

    private fun flushIceCandidateQueue(callId: String) {
        if (iceCandidateQueue.isNotEmpty()) {
            Log.d(TAG, "Flushing ${iceCandidateQueue.size} queued ICE candidates for callId: $callId")
            iceCandidateQueue.forEach { (targetUserId, candidate) ->
                sendIceCandidate(callId, targetUserId, candidate)
            }
            iceCandidateQueue.clear()
        }
    }

    private fun sendIceCandidate(callId: String, targetUserId: String, candidate: IceCandidate) {
        socketManager.sendIceCandidate(callId, targetUserId, candidate)
    }

    private fun handleIncomingCall(event: SocketEvent.IncomingCall) {
        Log.d(TAG, "Incoming call from ${event.callerName}")

        if (_uiState.value.callState != CallState.IDLE) {
            // Busy — reject
            socketManager.rejectCall(event.callId, event.callerId)
            return
        }

        pendingOffer = event.offer?.let {
            SessionDescription(SessionDescription.Type.OFFER, it)
        }

        _uiState.update {
            it.copy(
                callState = CallState.INCOMING,
                callId = event.callId,
                peerId = event.callerId,
                peerName = event.callerName,
                callType = event.callType,
                isOutgoing = false,
                callDuration = 0,
                errorMessage = null
            )
        }
    }

    private fun handleCallAnswered(event: SocketEvent.CallAnswered) {
        Log.d(TAG, "Call answered")

        cancelCallTimeout()

        event.answer?.let { answerSdp ->
            val sdp = SessionDescription(SessionDescription.Type.ANSWER, answerSdp)
            webRTCClient.setRemoteDescription(sdp)
        }

        // Don't set CONNECTED here — let onConnectionStateChange handle it
    }

    private fun handleCallRejected(event: SocketEvent.CallRejected) {
        Log.d(TAG, "Call rejected")
        cleanup()
    }

    private fun handleCallEnded(event: SocketEvent.CallEnded) {
        Log.d(TAG, "Call ended by remote")
        cleanup()
    }

    private fun handleIceCandidate(event: SocketEvent.IceCandidateReceived) {
        val candidate = IceCandidate(
            event.sdpMid,
            event.sdpMLineIndex,
            event.candidateSdp
        )
        webRTCClient.addIceCandidate(candidate)
    }

    fun onCallIdReceived(callId: String) {
        Log.d(TAG, "CallId received: $callId")
        _uiState.update { it.copy(callId = callId) }
        flushIceCandidateQueue(callId)
    }

    private fun cleanup() {
        cancelCallTimeout()
        callTimerJob?.cancel()
        callTimerJob = null
        webRTCClient.cleanup()
        pendingOffer = null
        iceCandidateQueue.clear()

        _uiState.update {
            it.copy(
                callState = CallState.IDLE,
                callId = "",
                peerId = "",
                peerName = "",
                callDuration = 0,
                isMuted = false,
                isSpeaker = false,
                isVideoEnabled = true,
                errorMessage = null
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        cleanup()
    }
}
