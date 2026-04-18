package com.app.abhichat.ui

import android.content.SharedPreferences
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Videocam
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
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.app.abhichat.data.socket.SocketManager
import com.app.abhichat.ui.login.LoginScreen
import com.app.abhichat.ui.chatlist.ChatListScreen
import com.app.abhichat.ui.chat.ChatScreen
import com.app.abhichat.ui.call.CallScreen
import com.app.abhichat.ui.settings.SettingsScreen
import org.json.JSONObject

// Data class for incoming call state
data class IncomingCallInfo(
    val callerId: String,
    val callerName: String,
    val callerPhoto: String?,
    val chatId: String,
    val type: String, // AUDIO or VIDEO
    val livekitRoom: String? = null
)

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("abhi_chat_prefs", 0) }
    val isLoggedIn = prefs.getString("access_token", null) != null

    val startDest = if (isLoggedIn) "chatlist" else "login"

    // Global incoming call state
    var incomingCall by remember { mutableStateOf<IncomingCallInfo?>(null) }

    // Connect socket if logged in
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            val token = prefs.getString("access_token", "") ?: ""
            SocketManager.connect(token)
        }
    }

    // Global incoming call listener
    DisposableEffect(isLoggedIn) {
        if (isLoggedIn) {
            SocketManager.on("call:incoming") { args ->
                if (args.isNotEmpty()) {
                    try {
                        val data = args[0] as JSONObject
                        incomingCall = IncomingCallInfo(
                            callerId = data.optString("callerId"),
                            callerName = data.optString("callerName", "Unknown"),
                            callerPhoto = data.optString("callerPhoto", null),
                            chatId = data.optString("chatId"),
                            type = data.optString("type", "AUDIO"),
                            livekitRoom = data.optString("livekitRoom", null)
                        )
                    } catch (_: Exception) {}
                }
            }
            SocketManager.on("call:timeout") { _ ->
                incomingCall = null
            }
        }
        onDispose {
            SocketManager.off("call:incoming")
            SocketManager.off("call:timeout")
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(navController = navController, startDestination = startDest) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    val token = prefs.getString("access_token", "") ?: ""
                    SocketManager.connect(token)
                    navController.navigate("chatlist") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }

        composable("chatlist") {
            ChatListScreen(
                onChatSelected = { chatId, chatTitle, otherUserId ->
                    navController.navigate("chat/$chatId/$chatTitle/$otherUserId")
                },
                onSettingsClick = { navController.navigate("settings") }
            )
        }

        composable(
            "chat/{chatId}/{chatTitle}/{otherUserId}",
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("chatTitle") { type = NavType.StringType },
                navArgument("otherUserId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            val chatTitle = backStackEntry.arguments?.getString("chatTitle") ?: ""
            val otherUserId = backStackEntry.arguments?.getString("otherUserId") ?: ""
            ChatScreen(
                chatId = chatId,
                chatTitle = chatTitle,
                otherUserId = otherUserId,
                currentUserId = prefs.getString("user_id", "") ?: "",
                onBack = { navController.popBackStack() },
                onStartCall = { type ->
                    navController.navigate("call/$chatId/$otherUserId/$chatTitle/$type")
                }
            )
        }

        composable(
            "call/{chatId}/{targetUserId}/{callerName}/{callType}?livekitRoom={livekitRoom}",
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("targetUserId") { type = NavType.StringType },
                navArgument("callerName") { type = NavType.StringType },
                navArgument("callType") { type = NavType.StringType },
                navArgument("livekitRoom") { type = NavType.StringType; defaultValue = "" }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            val targetUserId = backStackEntry.arguments?.getString("targetUserId") ?: ""
            val callerName = backStackEntry.arguments?.getString("callerName") ?: ""
            val callType = backStackEntry.arguments?.getString("callType") ?: "AUDIO"
            val livekitRoom = backStackEntry.arguments?.getString("livekitRoom") ?: ""
            CallScreen(
                chatId = chatId,
                targetUserId = targetUserId,
                callerName = callerName,
                callType = callType,
                livekitRoom = livekitRoom.ifEmpty { null },
                isOutgoing = livekitRoom.isEmpty(),
                onEnd = { navController.popBackStack() }
            )
        }

        composable("settings") {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onLogout = {
                    SocketManager.disconnect()
                    prefs.edit().clear().apply()
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }

        // Incoming call overlay (shown on top of any screen)
        incomingCall?.let { call ->
            IncomingCallOverlay(
                callerName = call.callerName,
                callType = call.type,
                onAccept = {
                    incomingCall = null
                    // Send call:answer to backend with livekitRoom
                    val payload = JSONObject().apply {
                        put("callerId", call.callerId)
                        put("chatId", call.chatId)
                        put("livekitRoom", call.livekitRoom ?: "")
                    }
                    SocketManager.emit("call:answer", payload)
                    // Navigate to call screen with livekitRoom
                    val roomParam = call.livekitRoom ?: ""
                    navController.navigate(
                        "call/${call.chatId}/${call.callerId}/${call.callerName}/${call.type}?livekitRoom=$roomParam"
                    )
                },
                onDecline = {
                    incomingCall = null
                    // Send call:reject to backend
                    val payload = JSONObject().apply {
                        put("callerId", call.callerId)
                        put("chatId", call.chatId)
                    }
                    SocketManager.emit("call:reject", payload)
                }
            )
        }
    } // end Box
}

@Composable
fun IncomingCallOverlay(
    callerName: String,
    callType: String,
    onAccept: () -> Unit,
    onDecline: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(32.dp)
        ) {
            // Caller avatar
            Box(
                modifier = Modifier
                    .size(100.dp)
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
                    fontSize = 40.sp,
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
                if (callType == "VIDEO") "Incoming Video Call" else "Incoming Voice Call",
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 16.sp
            )

            if (callType == "VIDEO") {
                Spacer(modifier = Modifier.height(4.dp))
                Icon(
                    Icons.Default.Videocam,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.5f),
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(64.dp))

            // Accept / Decline buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(64.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Decline
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    FloatingActionButton(
                        onClick = onDecline,
                        containerColor = Color.Red,
                        modifier = Modifier.size(64.dp),
                        shape = CircleShape
                    ) {
                        Icon(
                            Icons.Default.CallEnd,
                            contentDescription = "Decline",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Decline", color = Color.White.copy(alpha = 0.7f), fontSize = 14.sp)
                }

                // Accept
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    FloatingActionButton(
                        onClick = onAccept,
                        containerColor = Color(0xFF4CAF50),
                        modifier = Modifier.size(64.dp),
                        shape = CircleShape
                    ) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "Accept",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Accept", color = Color.White.copy(alpha = 0.7f), fontSize = 14.sp)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                "\uD83D\uDD12 End-to-end encrypted",
                color = Color.White.copy(alpha = 0.4f),
                fontSize = 12.sp
            )
        }
    }
}
