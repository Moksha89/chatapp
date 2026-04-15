package com.chatapp.data.webrtc

import android.content.Context
import android.util.Log
import com.chatapp.BuildConfig
import org.webrtc.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WebRTCClient @Inject constructor(
    private val context: Context
) {
    companion object {
        private const val TAG = "WebRTCClient"

        private val ICE_SERVERS: List<PeerConnection.IceServer> by lazy {
            val turnUrl = BuildConfig.TURN_SERVER_URL
            val turnUser = BuildConfig.TURN_USERNAME
            val turnPass = BuildConfig.TURN_PASSWORD

            buildList {
                // Multiple STUN servers for redundancy
                add(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer())
                add(PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer())
                add(PeerConnection.IceServer.builder("stun:stun2.l.google.com:19302").createIceServer())
                add(PeerConnection.IceServer.builder("stun:stun3.l.google.com:19302").createIceServer())
                add(PeerConnection.IceServer.builder("stun:stun4.l.google.com:19302").createIceServer())

                // Free Open Relay TURN servers (openrelayproject.org)
                add(PeerConnection.IceServer.builder("turn:openrelay.metered.ca:80")
                    .setUsername("openrelayproject")
                    .setPassword("openrelayproject")
                    .createIceServer())
                add(PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443")
                    .setUsername("openrelayproject")
                    .setPassword("openrelayproject")
                    .createIceServer())
                add(PeerConnection.IceServer.builder("turn:openrelay.metered.ca:443?transport=tcp")
                    .setUsername("openrelayproject")
                    .setPassword("openrelayproject")
                    .createIceServer())
                add(PeerConnection.IceServer.builder("turns:openrelay.metered.ca:443?transport=tcp")
                    .setUsername("openrelayproject")
                    .setPassword("openrelayproject")
                    .createIceServer())

                // TURN server from BuildConfig (set via env vars at build time)
                if (turnUrl.isNotEmpty() && turnUser.isNotEmpty() && turnPass.isNotEmpty()) {
                    val turnHost = turnUrl.replace("turn:", "").replace("turns:", "")
                    add(PeerConnection.IceServer.builder("turn:$turnHost")
                        .setUsername(turnUser)
                        .setPassword(turnPass)
                        .createIceServer())
                    add(PeerConnection.IceServer.builder("turn:$turnHost?transport=tcp")
                        .setUsername(turnUser)
                        .setPassword(turnPass)
                        .createIceServer())
                    add(PeerConnection.IceServer.builder("turns:$turnHost?transport=tcp")
                        .setUsername(turnUser)
                        .setPassword(turnPass)
                        .createIceServer())
                }
            }
        }
    }

    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null
    private var localVideoTrack: VideoTrack? = null
    private var localVideoSource: VideoSource? = null
    private var videoCapturer: CameraVideoCapturer? = null
    private var eglBase: EglBase? = null
    private var localStream: MediaStream? = null
    private var isFrontCamera = true

    var listener: WebRTCListener? = null

    interface WebRTCListener {
        fun onIceCandidate(candidate: IceCandidate)
        fun onConnectionStateChange(state: PeerConnection.PeerConnectionState)
        fun onRemoteStream(stream: MediaStream)
        fun onIceGatheringComplete()
    }

    fun initialize() {
        if (peerConnectionFactory != null) return

        val options = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(false)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(options)

        eglBase = EglBase.create()

        val encoderFactory = DefaultVideoEncoderFactory(
            eglBase!!.eglBaseContext, true, true
        )
        val decoderFactory = DefaultVideoDecoderFactory(eglBase!!.eglBaseContext)

        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .setOptions(PeerConnectionFactory.Options())
            .createPeerConnectionFactory()

        Log.d(TAG, "PeerConnectionFactory initialized")
    }

    fun createPeerConnection(): PeerConnection? {
        val rtcConfig = PeerConnection.RTCConfiguration(ICE_SERVERS).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
            iceTransportsType = PeerConnection.IceTransportsType.ALL
        }

        val observer = object : PeerConnection.Observer {
            override fun onSignalingChange(state: PeerConnection.SignalingState?) {
                Log.d(TAG, "Signaling state: $state")
            }

            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {
                Log.d(TAG, "ICE connection state: $state")
            }

            override fun onIceConnectionReceivingChange(receiving: Boolean) {}

            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {
                Log.d(TAG, "ICE gathering state: $state")
                if (state == PeerConnection.IceGatheringState.COMPLETE) {
                    listener?.onIceGatheringComplete()
                }
            }

            override fun onIceCandidate(candidate: IceCandidate?) {
                candidate?.let {
                    Log.d(TAG, "ICE candidate: ${it.sdpMid}")
                    listener?.onIceCandidate(it)
                }
            }

            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}

            override fun onAddStream(stream: MediaStream?) {
                Log.d(TAG, "Remote stream added")
                stream?.let { listener?.onRemoteStream(it) }
            }

            override fun onRemoveStream(stream: MediaStream?) {
                Log.d(TAG, "Remote stream removed")
            }

            override fun onDataChannel(dataChannel: DataChannel?) {}

            override fun onRenegotiationNeeded() {
                Log.d(TAG, "Renegotiation needed")
            }

            override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {}

            override fun onConnectionChange(newState: PeerConnection.PeerConnectionState?) {
                Log.d(TAG, "Connection state: $newState")
                newState?.let { listener?.onConnectionStateChange(it) }
            }
        }

        peerConnection = peerConnectionFactory?.createPeerConnection(rtcConfig, observer)
        Log.d(TAG, "PeerConnection created")
        return peerConnection
    }

    fun startLocalAudio(): AudioTrack? {
        val audioConstraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("echoCancellation", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("noiseSuppression", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("autoGainControl", "true"))
        }

        val audioSource = peerConnectionFactory?.createAudioSource(audioConstraints)
        localAudioTrack = peerConnectionFactory?.createAudioTrack("local_audio", audioSource)
        localAudioTrack?.setEnabled(true)

        localStream = peerConnectionFactory?.createLocalMediaStream("local_stream")
        localStream?.addTrack(localAudioTrack)

        peerConnection?.addTrack(localAudioTrack, listOf("local_stream"))

        Log.d(TAG, "Local audio started")
        return localAudioTrack
    }

    fun startLocalVideo(surfaceViewRenderer: SurfaceViewRenderer? = null): VideoTrack? {
        val enumerator = Camera2Enumerator(context)
        val deviceNames = enumerator.deviceNames

        val frontCamera = deviceNames.firstOrNull { enumerator.isFrontFacing(it) }
        val backCamera = deviceNames.firstOrNull { enumerator.isBackFacing(it) }
        val cameraName = if (isFrontCamera) frontCamera else backCamera

        if (cameraName == null) {
            Log.e(TAG, "No camera found")
            return null
        }

        videoCapturer = enumerator.createCapturer(cameraName, null)
        val surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", eglBase?.eglBaseContext)
        localVideoSource = peerConnectionFactory?.createVideoSource(videoCapturer!!.isScreencast)
        videoCapturer?.initialize(surfaceTextureHelper, context, localVideoSource?.capturerObserver)
        videoCapturer?.startCapture(1280, 720, 30)

        localVideoTrack = peerConnectionFactory?.createVideoTrack("local_video", localVideoSource)
        localVideoTrack?.setEnabled(true)

        surfaceViewRenderer?.let {
            localVideoTrack?.addSink(it)
        }

        localStream?.addTrack(localVideoTrack)
        peerConnection?.addTrack(localVideoTrack, listOf("local_stream"))

        Log.d(TAG, "Local video started")
        return localVideoTrack
    }

    fun createOffer(callback: (SessionDescription) -> Unit) {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
        }

        peerConnection?.createOffer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription?) {
                sdp?.let {
                    peerConnection?.setLocalDescription(object : SdpObserver {
                        override fun onCreateSuccess(p0: SessionDescription?) {}
                        override fun onSetSuccess() {
                            Log.d(TAG, "Local description set (offer)")
                            callback(it)
                        }
                        override fun onCreateFailure(error: String?) {
                            Log.e(TAG, "Set local desc failure: $error")
                        }
                        override fun onSetFailure(error: String?) {
                            Log.e(TAG, "Set local desc failure: $error")
                        }
                    }, it)
                }
            }
            override fun onSetSuccess() {}
            override fun onCreateFailure(error: String?) {
                Log.e(TAG, "Create offer failure: $error")
            }
            override fun onSetFailure(error: String?) {}
        }, constraints)
    }

    fun createAnswer(callback: (SessionDescription) -> Unit) {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
        }

        peerConnection?.createAnswer(object : SdpObserver {
            override fun onCreateSuccess(sdp: SessionDescription?) {
                sdp?.let {
                    peerConnection?.setLocalDescription(object : SdpObserver {
                        override fun onCreateSuccess(p0: SessionDescription?) {}
                        override fun onSetSuccess() {
                            Log.d(TAG, "Local description set (answer)")
                            callback(it)
                        }
                        override fun onCreateFailure(error: String?) {
                            Log.e(TAG, "Set local desc failure: $error")
                        }
                        override fun onSetFailure(error: String?) {
                            Log.e(TAG, "Set local desc failure: $error")
                        }
                    }, it)
                }
            }
            override fun onSetSuccess() {}
            override fun onCreateFailure(error: String?) {
                Log.e(TAG, "Create answer failure: $error")
            }
            override fun onSetFailure(error: String?) {}
        }, constraints)
    }

    fun setRemoteDescription(sdp: SessionDescription, callback: () -> Unit = {}) {
        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onCreateSuccess(p0: SessionDescription?) {}
            override fun onSetSuccess() {
                Log.d(TAG, "Remote description set")
                callback()
            }
            override fun onCreateFailure(error: String?) {
                Log.e(TAG, "Set remote desc failure: $error")
            }
            override fun onSetFailure(error: String?) {
                Log.e(TAG, "Set remote desc failure: $error")
            }
        }, sdp)
    }

    fun addIceCandidate(candidate: IceCandidate) {
        peerConnection?.addIceCandidate(candidate)
    }

    fun toggleMute(): Boolean {
        val enabled = localAudioTrack?.enabled() ?: return false
        localAudioTrack?.setEnabled(!enabled)
        return !enabled // returns new isMuted state (true = muted)
    }

    fun toggleVideo(): Boolean {
        val enabled = localVideoTrack?.enabled() ?: return false
        localVideoTrack?.setEnabled(!enabled)
        return !enabled
    }

    /**
     * P2-11: Enable/disable all tracks (hold/resume)
     */
    fun setTracksEnabled(enabled: Boolean) {
        localAudioTrack?.setEnabled(enabled)
        localVideoTrack?.setEnabled(enabled)
        Log.d(TAG, "All tracks ${if (enabled) "enabled" else "disabled"}")
    }

    /**
     * P2-9: Set max bitrate for adaptive quality
     */
    fun setMaxBitrate(maxBitrateKbps: Int) {
        peerConnection?.senders?.forEach { sender ->
            val params = sender.parameters
            if (params.encodings.isNotEmpty()) {
                params.encodings[0].maxBitrateBps = maxBitrateKbps * 1000
                sender.parameters = params
            }
        }
        Log.d(TAG, "Max bitrate set to ${maxBitrateKbps}kbps")
    }

    /**
     * P3-16: Get call statistics for metrics UI
     */
    fun getStats(callback: (Map<String, Any>) -> Unit) {
        peerConnection?.getStats { report ->
            val stats = mutableMapOf<String, Any>()
            report.statsMap.values.forEach { rtcStats ->
                if (rtcStats.type == "inbound-rtp") {
                    val members = rtcStats.members
                    val kind = members["kind"] as? String ?: ""
                    if (kind == "audio") {
                        stats["audioPacketsLost"] = members["packetsLost"] ?: 0
                        stats["audioPacketsReceived"] = members["packetsReceived"] ?: 0
                        stats["audioBytesReceived"] = members["bytesReceived"] ?: 0L
                    } else if (kind == "video") {
                        stats["videoPacketsLost"] = members["packetsLost"] ?: 0
                        stats["videoPacketsReceived"] = members["packetsReceived"] ?: 0
                        stats["videoBytesReceived"] = members["bytesReceived"] ?: 0L
                        stats["frameWidth"] = members["frameWidth"] ?: 0
                        stats["frameHeight"] = members["frameHeight"] ?: 0
                        stats["framesPerSecond"] = members["framesPerSecond"] ?: 0.0
                    }
                }
                if (rtcStats.type == "candidate-pair" && (rtcStats.members["state"] as? String) == "succeeded") {
                    stats["roundTripTime"] = rtcStats.members["currentRoundTripTime"] ?: 0.0
                }
            }
            callback(stats)
        }
    }

    fun switchCamera() {
        videoCapturer?.switchCamera(object : CameraVideoCapturer.CameraSwitchHandler {
            override fun onCameraSwitchDone(isFront: Boolean) {
                isFrontCamera = isFront
                Log.d(TAG, "Camera switched to ${if (isFront) "front" else "back"}")
            }
            override fun onCameraSwitchError(error: String?) {
                Log.e(TAG, "Camera switch error: $error")
            }
        })
    }

    fun getEglBase(): EglBase? = eglBase

    fun cleanup() {
        Log.d(TAG, "Cleaning up WebRTC resources")
        try {
            videoCapturer?.stopCapture()
            videoCapturer?.dispose()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping video capturer", e)
        }
        videoCapturer = null

        localVideoTrack?.dispose()
        localVideoTrack = null
        localVideoSource?.dispose()
        localVideoSource = null
        localAudioTrack?.dispose()
        localAudioTrack = null
        localStream = null

        peerConnection?.close()
        peerConnection?.dispose()
        peerConnection = null

        isFrontCamera = true
    }

    fun dispose() {
        cleanup()
        peerConnectionFactory?.dispose()
        peerConnectionFactory = null
        eglBase?.release()
        eglBase = null
    }
}
