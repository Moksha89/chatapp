package com.chatapp.presentation.calling

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import java.util.Locale

// M10: Check network connectivity before attempting a call
private fun isNetworkAvailable(context: Context): Boolean {
    val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        ?: return false
    val network = connectivityManager.activeNetwork ?: return false
    val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
}

// H7: Check required permissions for calls
private fun hasCallPermissions(context: Context, callType: String): Boolean {
    val audioPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
    if (audioPermission != PackageManager.PERMISSION_GRANTED) return false
    if (callType == "video") {
        val cameraPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
        if (cameraPermission != PackageManager.PERMISSION_GRANTED) return false
    }
    return true
}

@Composable
fun CallScreen(
    callerName: String,
    callType: String = "voice",
    isIncoming: Boolean = false,
    targetUserId: String = "",
    chatId: String = "",
    onEndCall: () -> Unit,
    onAcceptCall: () -> Unit = {},
    onToggleMute: () -> Unit = {},
    onToggleSpeaker: () -> Unit = {},
    onToggleVideo: () -> Unit = {},
    onFlipCamera: () -> Unit = {},
    callViewModel: CallViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val uiState by callViewModel.uiState.collectAsState()

    // Derive state from ViewModel
    val isMuted = uiState.isMuted
    val isSpeaker = uiState.isSpeaker
    val isVideoEnabled = uiState.isVideoEnabled
    val callDuration = uiState.callDuration
    val isConnected = uiState.callState == CallState.CONNECTED
    val callStateEnum = uiState.callState

    var isFrontCamera by remember { mutableStateOf(true) }
    var hasPermissions by remember { mutableStateOf(hasCallPermissions(context, callType)) }
    var showPermissionDialog by remember { mutableStateOf(false) }
    var hasNetwork by remember { mutableStateOf(isNetworkAvailable(context)) }
    val configuration = LocalConfiguration.current
    val isLandscape = configuration.screenWidthDp > configuration.screenHeightDp

    // Wakelock: Keep screen on during active calls
    DisposableEffect(Unit) {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        @Suppress("DEPRECATION")
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "chatapp:call_wakelock"
        )
        wakeLock?.acquire(60 * 60 * 1000L) // 1 hour max
        onDispose {
            if (wakeLock?.isHeld == true) {
                wakeLock.release()
            }
        }
    }

    // Ringtone: Play ringtone for incoming calls, ringback tone for outgoing calls
    DisposableEffect(callStateEnum) {
        var mediaPlayer: MediaPlayer? = null
        var vibrator: Vibrator? = null

        if (callStateEnum == CallState.INCOMING) {
            try {
                val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .build()
                    )
                    setDataSource(context, ringtoneUri)
                    isLooping = true
                    prepare()
                    start()
                }
                vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    vibratorManager?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }
                vibrator?.let { vib ->
                    val pattern = longArrayOf(0, 1000, 1000)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vib.vibrate(VibrationEffect.createWaveform(pattern, 0))
                    } else {
                        @Suppress("DEPRECATION")
                        vib.vibrate(pattern, 0)
                    }
                }
            } catch (_: Exception) { }
        } else if (callStateEnum == CallState.CALLING) {
            try {
                val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION_SIGNALLING)
                            .build()
                    )
                    setDataSource(context, ringtoneUri)
                    isLooping = true
                    setVolume(0.3f, 0.3f)
                    prepare()
                    start()
                }
            } catch (_: Exception) { }
        }

        onDispose {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            vibrator?.cancel()
        }
    }

    // Initiate the call via ViewModel when this screen opens (outgoing call)
    LaunchedEffect(Unit) {
        if (!isIncoming && targetUserId.isNotEmpty() && chatId.isNotEmpty()) {
            if (uiState.callState == CallState.IDLE) {
                callViewModel.initiateCall(targetUserId, callerName, callType, chatId)
            }
        }
    }

    // Navigate back when call ends (state goes to IDLE after being active)
    var wasActive by remember { mutableStateOf(false) }
    LaunchedEffect(callStateEnum) {
        if (callStateEnum != CallState.IDLE) {
            wasActive = true
        }
        if (callStateEnum == CallState.IDLE && wasActive) {
            onEndCall()
        }
    }

    // H7: Permission launcher for requesting audio/camera permissions
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasPermissions = permissions.values.all { it }
        if (!hasPermissions) {
            showPermissionDialog = true
        }
    }

    // H7: Request permissions on launch if not already granted
    LaunchedEffect(Unit) {
        if (!hasPermissions) {
            val permissionsToRequest = mutableListOf(Manifest.permission.RECORD_AUDIO)
            if (callType == "video") {
                permissionsToRequest.add(Manifest.permission.CAMERA)
            }
            permissionLauncher.launch(permissionsToRequest.toTypedArray())
        }
    }

    // M10: Check network connectivity
    LaunchedEffect(Unit) {
        hasNetwork = isNetworkAvailable(context)
    }

    // H6: Only set up audio mode when call is actually connected
    LaunchedEffect(isConnected) {
        if (isConnected) {
            try {
                val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                if (callType == "video") {
                    audioManager.isSpeakerphoneOn = true
                }
            } catch (_: Exception) { /* Audio setup failed gracefully */ }
        }
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

    // Speaker toggle effect
    LaunchedEffect(isSpeaker) {
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.isSpeakerphoneOn = isSpeaker
        } catch (_: Exception) {}
    }

    // H7: Permission denied dialog
    if (showPermissionDialog) {
        AlertDialog(
            onDismissRequest = { showPermissionDialog = false; onEndCall() },
            title = { Text("Permission Required") },
            text = {
                Text(
                    if (callType == "video")
                        "Camera and microphone permissions are required for video calls."
                    else
                        "Microphone permission is required for voice calls."
                )
            },
            confirmButton = {
                TextButton(onClick = { showPermissionDialog = false; onEndCall() }) {
                    Text("OK")
                }
            }
        )
    }

    // L6: Use theme colors
    val primaryColor = MaterialTheme.colorScheme.primary
    val errorColor = MaterialTheme.colorScheme.error

    // Full-screen incoming call UI (Fiberchat-inspired pickup screen)
    if (callStateEnum == CallState.INCOMING) {
        IncomingCallScreen(
            callerName = callerName,
            callType = callType,
            pulseScale = pulseScale,
            onAccept = {
                callViewModel.answerCall()
                onAcceptCall()
            },
            onReject = {
                callViewModel.rejectCall()
            }
        )
        return
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
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)
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
                    .background(MaterialTheme.colorScheme.primary)
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
                        color = MaterialTheme.colorScheme.primary
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
                        text = when (callStateEnum) {
                            CallState.IDLE -> "Ended"
                            CallState.CALLING -> "Calling..."
                            CallState.INCOMING -> "Incoming ${callType} call..."
                            CallState.CONNECTED -> formatDuration(callDuration)
                            CallState.RECONNECTING -> "Reconnecting..."
                            CallState.ENDED -> "Call ended"
                        },
                        color = when (callStateEnum) {
                            CallState.RECONNECTING -> Color(0xFFFF9800)
                            CallState.ENDED -> errorColor
                            else -> Color.White.copy(alpha = 0.7f)
                        },
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
                            callViewModel.toggleMute()
                            onToggleMute()
                        }
                    )

                    CallControlButton(
                        icon = if (isSpeaker) Icons.Default.VolumeUp else Icons.Default.VolumeDown,
                        label = "Speaker",
                        isActive = isSpeaker,
                        onClick = {
                            callViewModel.toggleSpeaker()
                            onToggleSpeaker()
                        }
                    )

                    if (callType == "video") {
                        CallControlButton(
                            icon = if (isVideoEnabled) Icons.Default.Videocam else Icons.Default.VideocamOff,
                            label = "Camera",
                            isActive = isVideoEnabled,
                            onClick = {
                                callViewModel.toggleVideo()
                                onToggleVideo()
                            }
                        )

                        // C6: Camera flip with actual toggle and callback
                        CallControlButton(
                            icon = Icons.Default.FlipCameraAndroid,
                            label = if (isFrontCamera) "Back" else "Front",
                            isActive = false,
                            onClick = {
                                isFrontCamera = !isFrontCamera
                                callViewModel.switchCamera()
                                onFlipCamera()
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // End call button (incoming calls handled by IncomingCallScreen)
                FloatingActionButton(
                    onClick = { callViewModel.endCall() },
                    containerColor = errorColor,
                    modifier = Modifier.size(64.dp)
                ) {
                    Icon(Icons.Default.CallEnd, contentDescription = "End Call", tint = Color.White, modifier = Modifier.size(32.dp))
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
        // M10: No network overlay
        if (!hasNetwork) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.7f)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.WifiOff,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No network connection",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Check your internet and try again",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

/**
 * Full-screen incoming call screen (Fiberchat-inspired pickup_screen)
 */
@Composable
fun IncomingCallScreen(
    callerName: String,
    callType: String,
    pulseScale: Float,
    onAccept: () -> Unit,
    onReject: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF1B5E20), Color(0xFF0D1B2A), Color(0xFF1B2B34))
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 60.dp)
            ) {
                Icon(
                    if (callType == "video") Icons.Default.Videocam else Icons.Default.Call,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.6f),
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (callType == "video") "Incoming Video Call" else "Incoming Voice Call",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(contentAlignment = Alignment.Center) {
                    Surface(
                        modifier = Modifier.size(180.dp).scale(pulseScale).clip(CircleShape),
                        color = Color.White.copy(alpha = 0.1f)
                    ) {}
                    Surface(
                        modifier = Modifier.size(155.dp).scale(pulseScale * 0.95f).clip(CircleShape),
                        color = Color.White.copy(alpha = 0.15f)
                    ) {}
                    Surface(
                        modifier = Modifier.size(130.dp).clip(CircleShape),
                        color = MaterialTheme.colorScheme.primary
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = callerName.firstOrNull()?.toString() ?: "?",
                                color = Color.White,
                                fontSize = 56.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))
                Text(text = callerName, color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = Color.White.copy(alpha = 0.5f), modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(text = "End-to-end encrypted", color = Color.White.copy(alpha = 0.5f), fontSize = 13.sp)
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(bottom = 48.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        FloatingActionButton(
                            onClick = onReject,
                            containerColor = Color(0xFFE53935),
                            modifier = Modifier.size(72.dp)
                        ) {
                            Icon(Icons.Default.CallEnd, contentDescription = "Decline", tint = Color.White, modifier = Modifier.size(36.dp))
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(text = "Decline", color = Color.White.copy(alpha = 0.8f), fontSize = 14.sp)
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        FloatingActionButton(
                            onClick = onAccept,
                            containerColor = Color(0xFF43A047),
                            modifier = Modifier.size(72.dp)
                        ) {
                            Icon(Icons.Default.Call, contentDescription = "Accept", tint = Color.White, modifier = Modifier.size(36.dp))
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(text = "Accept", color = Color.White.copy(alpha = 0.8f), fontSize = 14.sp)
                    }
                }
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

// L5: Use explicit Locale to avoid locale-dependent formatting
fun formatDuration(seconds: Int): String {
    val hrs = seconds / 3600
    val mins = (seconds % 3600) / 60
    val secs = seconds % 60
    return if (hrs > 0) {
        String.format(Locale.US, "%d:%02d:%02d", hrs, mins, secs)
    } else {
        String.format(Locale.US, "%02d:%02d", mins, secs)
    }
}
