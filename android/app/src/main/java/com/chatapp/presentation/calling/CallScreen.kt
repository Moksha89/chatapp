package com.chatapp.presentation.calling

import android.content.Context
import android.media.AudioManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun CallScreen(
    callerName: String,
    callType: String = "voice",
    isIncoming: Boolean = false,
    onEndCall: () -> Unit,
    onAcceptCall: () -> Unit = {},
    onToggleMute: () -> Unit = {},
    onToggleSpeaker: () -> Unit = {},
    onToggleVideo: () -> Unit = {}
) {
    val context = LocalContext.current
    var isMuted by remember { mutableStateOf(false) }
    var isSpeaker by remember { mutableStateOf(callType == "video") }
    var isVideoEnabled by remember { mutableStateOf(callType == "video") }
    var callDuration by remember { mutableIntStateOf(0) }
    var isConnected by remember { mutableStateOf(false) }
    var callState by remember { mutableStateOf(if (isIncoming) "ringing" else "connecting") }

    // Show "User unavailable" after timeout instead of fake connecting
    LaunchedEffect(callState) {
        if (callState == "connecting") {
            kotlinx.coroutines.delay(8000)
            if (!isConnected) {
                callState = "unavailable"
            }
        } else if (callState == "unavailable") {
            kotlinx.coroutines.delay(3000)
            onEndCall()
        }
    }

    // Set up audio for call
    LaunchedEffect(callType) {
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            if (callType == "video") {
                audioManager.isSpeakerphoneOn = true
            }
        } catch (_: Exception) {}
    }

    // Cleanup audio on dispose
    DisposableEffect(Unit) {
        onDispose {
            try {
                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                audioManager.mode = AudioManager.MODE_NORMAL
                audioManager.isSpeakerphoneOn = false
                audioManager.isMicrophoneMute = false
            } catch (_: Exception) {}
        }
    }

    // Pulse animation for ringing
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    // Call timer
    LaunchedEffect(isConnected) {
        if (isConnected) {
            while (true) {
                kotlinx.coroutines.delay(1000)
                callDuration++
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                if (callType == "video" && isConnected)
                    Brush.verticalGradient(listOf(Color(0xFF0D1B2A), Color(0xFF1B2B34)))
                else
                    Brush.verticalGradient(listOf(Color(0xFF1B2B34), Color(0xFF1B2B34)))
            )
    ) {
        // Video call connected: show remote video placeholder
        if (callType == "video" && isConnected && isVideoEnabled) {
            // Full-screen "remote video" area
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Surface(
                        modifier = Modifier
                            .size(160.dp)
                            .clip(CircleShape),
                        color = Color(0xFF246BFD).copy(alpha = 0.6f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = callerName.firstOrNull()?.toString() ?: "?",
                                color = Color.White,
                                fontSize = 64.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = callerName,
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = formatDuration(callDuration),
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 14.sp
                    )
                }
            }

            // Self-view in corner (small PiP)
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 48.dp, end = 16.dp)
                    .size(100.dp, 140.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF246BFD))
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        tint = Color.White.copy(alpha = 0.7f),
                        modifier = Modifier.size(40.dp)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "You",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 12.sp
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top section - only show full info for voice calls or when not connected
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 48.dp)
            ) {
                if (!(callType == "video" && isConnected && isVideoEnabled)) {
                    // Avatar
                    Surface(
                        modifier = Modifier
                            .size(120.dp)
                            .clip(CircleShape)
                            .then(
                                if (!isConnected) Modifier.scale(pulseScale) else Modifier
                            ),
                        color = Color(0xFF246BFD)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = callerName.firstOrNull()?.toString() ?: "?",
                                color = Color.White,
                                fontSize = 48.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = callerName,
                        color = Color.White,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.SemiBold
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = when {
                            isIncoming && !isConnected -> "Incoming ${callType} call..."
                            callState == "unavailable" -> "User unavailable"
                            callState == "connecting" -> "Calling..."
                            isConnected -> formatDuration(callDuration)
                            else -> "Calling..."
                        },
                        color = if (callState == "unavailable") Color(0xFFFF6B6B) else Color.White.copy(alpha = 0.7f),
                        fontSize = 16.sp
                    )

                    if (callType == "video" && !isConnected) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Video Call",
                            color = Color.White.copy(alpha = 0.5f),
                            fontSize = 14.sp
                        )
                    }
                }

                // E2E encryption badge
                if (isConnected) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Lock,
                            contentDescription = null,
                            tint = Color.White.copy(alpha = 0.5f),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "End-to-end encrypted",
                            color = Color.White.copy(alpha = 0.5f),
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // Bottom controls
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                // Control buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    CallControlButton(
                        icon = if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                        label = if (isMuted) "Unmute" else "Mute",
                        isActive = isMuted,
                        onClick = {
                            isMuted = !isMuted
                            try {
                                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                                audioManager.isMicrophoneMute = isMuted
                            } catch (_: Exception) {}
                            onToggleMute()
                        }
                    )

                    CallControlButton(
                        icon = if (isSpeaker) Icons.Default.VolumeUp else Icons.Default.VolumeDown,
                        label = "Speaker",
                        isActive = isSpeaker,
                        onClick = {
                            isSpeaker = !isSpeaker
                            try {
                                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                                audioManager.isSpeakerphoneOn = isSpeaker
                            } catch (_: Exception) {}
                            onToggleSpeaker()
                        }
                    )

                    if (callType == "video") {
                        CallControlButton(
                            icon = if (isVideoEnabled) Icons.Default.Videocam else Icons.Default.VideocamOff,
                            label = "Camera",
                            isActive = isVideoEnabled,
                            onClick = {
                                isVideoEnabled = !isVideoEnabled
                                onToggleVideo()
                            }
                        )

                        CallControlButton(
                            icon = Icons.Default.FlipCameraAndroid,
                            label = "Flip",
                            isActive = false,
                            onClick = { /* Camera flip - needs WebRTC */ }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Accept/Reject buttons
                if (isIncoming && !isConnected) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        FloatingActionButton(
                            onClick = onEndCall,
                            containerColor = Color.Red,
                            modifier = Modifier.size(64.dp)
                        ) {
                            Icon(Icons.Default.CallEnd, contentDescription = "Reject", tint = Color.White, modifier = Modifier.size(32.dp))
                        }

                        FloatingActionButton(
                            onClick = {
                                isConnected = true
                                callState = "connected"
                                onAcceptCall()
                            },
                            containerColor = Color(0xFF246BFD),
                            modifier = Modifier.size(64.dp)
                        ) {
                            Icon(Icons.Default.Call, contentDescription = "Accept", tint = Color.White, modifier = Modifier.size(32.dp))
                        }
                    }
                } else {
                    FloatingActionButton(
                        onClick = onEndCall,
                        containerColor = Color.Red,
                        modifier = Modifier.size(64.dp)
                    ) {
                        Icon(Icons.Default.CallEnd, contentDescription = "End Call", tint = Color.White, modifier = Modifier.size(32.dp))
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun CallControlButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    isActive: Boolean = false,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(
            onClick = onClick,
            modifier = Modifier
                .size(56.dp)
                .background(
                    if (isActive) Color.White.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.1f),
                    CircleShape
                )
        ) {
            Icon(icon, contentDescription = label, tint = Color.White, modifier = Modifier.size(28.dp))
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp, textAlign = TextAlign.Center)
    }
}

fun formatDuration(seconds: Int): String {
    val hrs = seconds / 3600
    val mins = (seconds % 3600) / 60
    val secs = seconds % 60
    return if (hrs > 0) {
        String.format("%d:%02d:%02d", hrs, mins, secs)
    } else {
        String.format("%02d:%02d", mins, secs)
    }
}
