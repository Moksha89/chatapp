package com.chatapp.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chatapp.presentation.auth.LoginScreen
import com.chatapp.presentation.chat.ChatListScreen
import com.chatapp.presentation.chat.ChatScreen
import com.chatapp.presentation.qr.QrScannerScreen
import com.chatapp.presentation.settings.SettingsScreen
import com.chatapp.presentation.settings.PrivacySettingsScreen
import com.chatapp.presentation.settings.BlockedUser
import com.chatapp.presentation.contacts.NewChatScreen
import com.chatapp.presentation.contacts.ContactUser

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object ChatList : Screen("chat_list")
    object Chat : Screen("chat/{chatId}") {
        fun createRoute(chatId: String) = "chat/$chatId"
    }
    object QrScanner : Screen("qr_scanner")
    object Settings : Screen("settings")
    object Privacy : Screen("privacy")
    object NewChat : Screen("new_chat")
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.ChatList.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.ChatList.route) {
            ChatListScreen(
                onChatClick = { chatId ->
                    navController.navigate(Screen.Chat.createRoute(chatId))
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.ChatList.route) { inclusive = true }
                    }
                },
                onScanQr = {
                    navController.navigate(Screen.QrScanner.route)
                },
                onSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onNewChat = {
                    navController.navigate(Screen.NewChat.route)
                }
            )
        }

        composable(
            route = Screen.Chat.route,
            arguments = listOf(navArgument("chatId") { type = NavType.StringType })
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: return@composable
            ChatScreen(
                chatId = chatId,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.QrScanner.route) {
            QrScannerScreen(
                onBack = { navController.popBackStack() },
                onPairingCodeScanned = { },
                onConfirmPairing = { pairingCode ->
                    Result.success(true)
                }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onBusinessProfile = { },
                onLinkedDevices = { navController.navigate(Screen.QrScanner.route) },
                onPrivacy = { navController.navigate(Screen.Privacy.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Privacy.route) {
            var readReceiptsEnabled by remember { mutableStateOf(true) }
            var blockedUsers by remember { mutableStateOf(listOf<BlockedUser>()) }
            
            PrivacySettingsScreen(
                onBack = { navController.popBackStack() },
                readReceiptsEnabled = readReceiptsEnabled,
                onReadReceiptsToggle = { enabled -> readReceiptsEnabled = enabled },
                blockedUsers = blockedUsers,
                onUnblockUser = { userId -> 
                    blockedUsers = blockedUsers.filter { it.id != userId }
                }
            )
        }

        composable(Screen.NewChat.route) {
            // Sample users - in real app, fetch from API
            val sampleUsers = listOf(
                ContactUser("1", "John Doe", "+1234567890"),
                ContactUser("2", "Jane Smith", "+0987654321"),
                ContactUser("3", "Business Contact", "+1122334455")
            )
            NewChatScreen(
                onBack = { navController.popBackStack() },
                onUserSelected = { userId ->
                    navController.navigate(Screen.Chat.createRoute(userId))
                },
                users = sampleUsers
            )
        }
    }
}
