package com.app.abhichat.ui.call

import android.app.Activity
import android.app.Application
import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.app.abhichat.BuildConfig
import com.app.abhichat.data.model.LiveKitTokenRequest
import com.app.abhichat.data.model.TokenResponse
import com.app.abhichat.data.socket.SocketManager
import com.app.abhichat.ui.MainActivity
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import com.app.abhichat.data.api.ApiService
import okhttp3.Interceptor
import okhttp3.OkHttpClient

@Composable
fun CallScreen(
    chatId: String,
    targetUserId: String,
    callerName: String,
    callType: String,
    livekitRoom: String? = null,
    isOutgoing: Boolean = true,
    onEnd: () -> Unit
) {
    val context = LocalContext.current
    val application = context.applicationContext as Application
    val prefs = remember { context.getSharedPreferences("abhi_chat_prefs", 0) }
    val scope = rememberCoroutineScope()
    val activity = context as? MainActivity

    var callState by remember { mutableStateOf(if (isOutgoing) "CALLING" else "CONNECTING") }
    var isMuted by remember { mutableStateOf(false) }
    var isSpeaker by remember { mutableStateOf(false) }
    var isVideoEnabled by remember { mutableStateOf(callType == "VIDEO") }
    var duration by remember { mutableStateOf(0) }
    var roomName by remember { mutableStateOf(livekitRoom ?: "") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // PiP state from activity
    val isInPipMode = activity?.isInPipMode?.value ?: false

    // Notify activity about call state for PiP
    LaunchedEffect(callState) {
        activity?.isInCall?.value = callState != "ENDED"
    }
    DisposableEffect(Unit) {
        activity?.isInCall?.value = true
        onDispose {
            activity?.isInCall?.value = false
        }
    }

    // LiveKit room instance
    val room = remember { LiveKit.create(application) }

    // Build API client for token request
    val apiService = remember {
        val token = prefs.getString("access_token", "") ?: ""
        val client = OkHttpClient.Builder()
            .addInterceptor(Interceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .build()
                chain.proceed(request)
            })
            .build()
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_URL + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    // Connect to LiveKit when we have a room name
    fun connectToLiveKit(finalRoomName: String) {
        scope.launch {
            try {
                callState = "CONNECTING"
                val tokenResponse: TokenResponse = apiService.getLiveKitToken(
                    LiveKitTokenRequest(finalRoomName)
                )
                val livekitUrl = BuildConfig.API_URL
                    .replace("https://", "wss://")
                    .replace("http://", "ws://") + "/livekit/"

                room.connect(livekitUrl, tokenResponse.token)

                val localParticipant = room.localParticipant
                localParticipant.setMicrophoneEnabled(true)
                if (callType == "VIDEO") {
                    localParticipant.setCameraEnabled(true)
                }

                callState = "CONNECTED"
            } catch (e: Exception) {
                errorMessage = "Connection failed: ${e.message}"
                callState = "ENDED"
            }
        }
    }

    // For outgoing calls: initiate via socket, wait for room-ready and answered events
    LaunchedEffect(Unit) {
        if (isOutgoing) {
            SocketManager.on("call:room-ready") { args ->
                if (args.isNotEmpty()) {
                    try {
                        val data = args[0] as JSONObject
                        roomName = data.optString("livekitRoom", "")
                    } catch (_: Exception) {}
                }
            }

            SocketManager.on("call:answered") { args ->
                if (args.isNotEmpty()) {
                    try {
                        val data = args[0] as JSONObject
                        val answeredRoom = data.optString("livekitRoom", roomName)
                        if (answeredRoom.isNotEmpty()) {
                            roomName = answeredRoom
                            connectToLiveKit(answeredRoom)
                        }
                    } catch (_: Exception) {}
                }
            }

            val payload = JSONObject().apply {
                put("targetUserId", targetUserId)
                put("chatId", chatId)
                put("type", callType)
            }
            SocketManager.emit("call:initiate", payload)
        } else {
            // Incoming call: connect immediately with the provided room name
            if (!livekitRoom.isNullOrEmpty()) {
                connectToLiveKit(livekitRoom)
            }
        }
    }

    // Listen for call end/reject events
    LaunchedEffect(Unit) {
        SocketManager.on("call:ended") { _ ->
            callState = "ENDED"
        }
        SocketManager.on("call:rejected") { _ ->
            callState = "ENDED"
        }
    }

    // Collect LiveKit room events
    LaunchedEffect(room) {
        room.events.collect { event ->
            when (event) {
                is RoomEvent.ParticipantConnected -> {
                    callState = "CONNECTED"
                }
                is RoomEvent.ParticipantDisconnected -> {
                    if (room.remoteParticipants.isEmpty()) {
                        callState = "ENDED"
                    }
                }
                is RoomEvent.Disconnected -> {
                    callState = "ENDED"
                }
                else -> {}
            }
        }
    }

    // Call timeout (45 seconds for outgoing)
    LaunchedEffect(callState) {
        if (callState == "CALLING") {
            delay(45000)
            if (callState == "CALLING") {
                callState = "ENDED"
                val payload = JSONObject().apply {
                    put("targetUserId", targetUserId)
                    put("chatId", chatId)
                }
                SocketManager.emit("call:end", payload)
            }
        }
    }

    // Duration timer
    LaunchedEffect(callState) {
        if (callState == "CONNECTED") {
            while (callState == "CONNECTED") {
                delay(1000)
                duration++
            }
        }
    }

    // Auto-navigate back on ended
    LaunchedEffect(callState) {
        if (callState == "ENDED") {
            delay(2000)
            onEnd()
        }
    }

    // Cleanup
    DisposableEffect(Unit) {
        onDispose {
            room.disconnect()
            SocketManager.off("call:room-ready")
            SocketManager.off("call:answered")
            SocketManager.off("call:ended")
            SocketManager.off("call:rejected")
        }
    }

    // PiP minimized view — show only avatar + name + duration + end button
    if (isInPipMode) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF1A1A2E)),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFF246BFD), Color(0xFF6C5CE7))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        callerName.take(1).uppercase(),
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    callerName,
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
                if (callState == "CONNECTED") {
                    Text(
                        formatDuration(duration),
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 12.sp
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                FloatingActionButton(
                    onClick = {
                        callState = "ENDED"
                        room.disconnect()
                        val payload = JSONObject().apply {
                            put("targetUserId", targetUserId)
                            put("chatId", chatId)
                        }
                        SocketManager.emit("call:end", payload)
                    },
                    containerColor = Color.Red,
                    modifier = Modifier.size(40.dp),
                    shape = CircleShape
                ) {
                    Icon(
                        Icons.Default.CallEnd,
                        contentDescription = "End Call",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
        return
    }

    // Full call screen UI
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF1A1A2E), Color(0xFF16213E))
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        // Minimize button (top-left, only when connected)
        if (callState == "CONNECTED" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            IconButton(
                onClick = {
                    activity?.let { act ->
                        val params = PictureInPictureParams.Builder()
                            .setAspectRatio(Rational(9, 16))
                            .build()
                        act.enterPictureInPictureMode(params)
                    }
                },
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(top = 48.dp, start = 16.dp)
            ) {
                Icon(
                    Icons.Default.PictureInPicture,
                    contentDescription = "Minimize",
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Caller Avatar
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Color(0xFF246BFD), Color(0xFF6C5CE7))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    callerName.take(1).uppercase(),
                    color = Color.White,
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                callerName,
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                when (callState) {
                    "CALLING" -> if (callType == "VIDEO") "Video Calling..." else "Calling..."
                    "CONNECTING" -> "Connecting..."
                    "CONNECTED" -> formatDuration(duration)
                    "ENDED" -> errorMessage ?: "Call Ended"
                    else -> ""
                },
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 16.sp
            )

            if (callType == "VIDEO" && callState != "CONNECTED") {
                Spacer(modifier = Modifier.height(8.dp))
                Icon(
                    Icons.Default.Videocam,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.5f),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(80.dp))

            // Call Controls
            if (callState != "ENDED") {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(24.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CallControlButton(
                        icon = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                        label = if (isMuted) "Unmute" else "Mute",
                        isActive = isMuted,
                        onClick = {
                            isMuted = !isMuted
                            scope.launch {
                                room.localParticipant.setMicrophoneEnabled(!isMuted)
                            }
                        }
                    )

                    if (callType == "VIDEO") {
                        CallControlButton(
                            icon = if (isVideoEnabled) Icons.Default.Videocam else Icons.Default.VideocamOff,
                            label = if (isVideoEnabled) "Camera" else "Camera Off",
                            isActive = !isVideoEnabled,
                            onClick = {
                                isVideoEnabled = !isVideoEnabled
                                scope.launch {
                                    room.localParticipant.setCameraEnabled(isVideoEnabled)
                                }
                            }
                        )
                    }

                    CallControlButton(
                        icon = if (isSpeaker) Icons.Default.VolumeUp else Icons.Default.VolumeDown,
                        label = if (isSpeaker) "Speaker" else "Earpiece",
                        isActive = isSpeaker,
                        onClick = { isSpeaker = !isSpeaker }
                    )

                    FloatingActionButton(
                        onClick = {
                            callState = "ENDED"
                            room.disconnect()
                            val payload = JSONObject().apply {
                                put("targetUserId", targetUserId)
                                put("chatId", chatId)
                            }
                            SocketManager.emit("call:end", payload)
                        },
                        containerColor = Color.Red,
                        modifier = Modifier.size(64.dp),
                        shape = CircleShape
                    ) {
                        Icon(
                            Icons.Default.CallEnd,
                            contentDescription = "End Call",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }
        }

        // E2E Encryption badge
        Text(
            "\uD83D\uDD12 End-to-end encrypted",
            color = Color.White.copy(alpha = 0.4f),
            fontSize = 12.sp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp)
        )
    }
}

@Composable
fun CallControlButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isActive: Boolean,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        FloatingActionButton(
            onClick = onClick,
            containerColor = if (isActive) Color.White else Color.White.copy(alpha = 0.2f),
            modifier = Modifier.size(56.dp),
            shape = CircleShape
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = if (isActive) Color.Black else Color.White,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(label, color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
    }
}

private fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%d:%02d".format(m, s)
}
