package com.app.abhichat.ui

import android.content.SharedPreferences
import androidx.compose.runtime.*
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

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("abhi_chat_prefs", 0) }
    val isLoggedIn = prefs.getString("access_token", null) != null

    val startDest = if (isLoggedIn) "chatlist" else "login"

    // Connect socket if logged in
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            val token = prefs.getString("access_token", "") ?: ""
            SocketManager.connect(token)
        }
    }

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
            "call/{chatId}/{targetUserId}/{callerName}/{callType}",
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("targetUserId") { type = NavType.StringType },
                navArgument("callerName") { type = NavType.StringType },
                navArgument("callType") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            val targetUserId = backStackEntry.arguments?.getString("targetUserId") ?: ""
            val callerName = backStackEntry.arguments?.getString("callerName") ?: ""
            val callType = backStackEntry.arguments?.getString("callType") ?: "AUDIO"
            CallScreen(
                chatId = chatId,
                targetUserId = targetUserId,
                callerName = callerName,
                callType = callType,
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
}
