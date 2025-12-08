package com.chatapp.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chatapp.presentation.auth.LoginScreen
import com.chatapp.presentation.chat.ChatListScreen
import com.chatapp.presentation.chat.ChatScreen
import com.chatapp.presentation.qr.QrScannerScreen
import com.chatapp.presentation.qr.QrViewModel
import com.chatapp.presentation.settings.SettingsScreen
import com.chatapp.presentation.settings.PrivacySettingsScreen
import com.chatapp.presentation.contacts.NewChatScreen
import com.chatapp.presentation.contacts.NewChatViewModel
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
            val qrViewModel: QrViewModel = hiltViewModel()
            
            QrScannerScreen(
                onBack = { navController.popBackStack() },
                onPairingCodeScanned = { },
                onConfirmPairing = { pairingCode ->
                    qrViewModel.confirmPairing(pairingCode)
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
            PrivacySettingsScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.NewChat.route) {
            val newChatViewModel: NewChatViewModel = hiltViewModel()
            val newChatUiState by newChatViewModel.uiState.collectAsState()
            
            // Navigate to chat when created
            LaunchedEffect(newChatUiState.createdChatId) {
                newChatUiState.createdChatId?.let { chatId ->
                    navController.navigate(Screen.Chat.createRoute(chatId)) {
                        popUpTo(Screen.NewChat.route) { inclusive = true }
                    }
                    newChatViewModel.clearCreatedChatId()
                }
            }
            
            // Convert Contact to ContactUser for the screen
            val contactUsers = newChatUiState.contacts.map { contact ->
                ContactUser(
                    id = contact.id,
                    displayName = contact.displayName,
                    phoneNumber = contact.phoneNumber
                )
            }
            
            NewChatScreen(
                onBack = { navController.popBackStack() },
                onUserSelected = { userId ->
                    newChatViewModel.createChat(userId)
                },
                users = contactUsers,
                isLoading = newChatUiState.isLoading,
                onSearch = { query ->
                    newChatViewModel.searchUsers(query)
                }
            )
        }
    }
}
