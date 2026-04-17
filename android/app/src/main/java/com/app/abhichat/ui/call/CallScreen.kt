package com.app.abhichat.ui.call

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.app.abhichat.data.socket.SocketManager
import kotlinx.coroutines.delay
import org.json.JSONObject

@Composable
fun CallScreen(
    chatId: String,
    targetUserId: String,
    callerName: String,
    callType: String,
    onEnd: () -> Unit
) {
    var callState by remember { mutableStateOf("CALLING") } // CALLING, CONNECTED, ENDED
    var isMuted by remember { mutableStateOf(false) }
    var isSpeaker by remember { mutableStateOf(false) }
    var duration by remember { mutableStateOf(0) }
    var callId by remember { mutableStateOf("") }

    // Initiate call via socket
    LaunchedEffect(Unit) {
        val payload = JSONObject().apply {
            put("targetUserId", targetUserId)
            put("chatId", chatId)
            put("type", callType)
        }
        SocketManager.emit("call:initiate", payload) { response ->
            if (response.isNotEmpty()) {
                try {
                    val data = response[0] as JSONObject
                    callId = data.optString("callId", "")
                } catch (_: Exception) {}
            }
        }
    }

    // Listen for call events
    LaunchedEffect(Unit) {
        SocketManager.on("call:answered") { _ ->
            callState = "CONNECTED"
        }
        SocketManager.on("call:ended") { _ ->
            callState = "ENDED"
        }
        SocketManager.on("call:rejected") { _ ->
            callState = "ENDED"
        }
    }

    // Call timeout (45 seconds)
    LaunchedEffect(callState) {
        if (callState == "CALLING") {
            delay(45000)
            if (callState == "CALLING") {
                callState = "ENDED"
                endCall(callId)
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
            SocketManager.off("call:answered")
            SocketManager.off("call:ended")
            SocketManager.off("call:rejected")
        }
    }

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

            // Caller Name
            Text(
                callerName,
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Call Status
            Text(
                when (callState) {
                    "CALLING" -> if (callType == "VIDEO") "Video Calling..." else "Calling..."
                    "CONNECTED" -> formatDuration(duration)
                    "ENDED" -> "Call Ended"
                    else -> ""
                },
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 16.sp
            )

            // Call type icon
            if (callType == "VIDEO") {
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
                    horizontalArrangement = Arrangement.spacedBy(32.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Mute
                    CallControlButton(
                        icon = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                        label = if (isMuted) "Unmute" else "Mute",
                        isActive = isMuted,
                        onClick = { isMuted = !isMuted }
                    )

                    // Speaker
                    CallControlButton(
                        icon = if (isSpeaker) Icons.Default.VolumeUp else Icons.Default.VolumeDown,
                        label = if (isSpeaker) "Speaker" else "Earpiece",
                        isActive = isSpeaker,
                        onClick = { isSpeaker = !isSpeaker }
                    )

                    // End Call
                    FloatingActionButton(
                        onClick = {
                            callState = "ENDED"
                            endCall(callId)
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
            "🔒 End-to-end encrypted",
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

private fun endCall(callId: String) {
    if (callId.isNotEmpty()) {
        val payload = JSONObject().apply { put("callId", callId) }
        SocketManager.emit("call:end", payload)
    }
}

private fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%d:%02d".format(m, s)
}
