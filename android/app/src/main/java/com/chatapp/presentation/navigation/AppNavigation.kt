package com.chatapp.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.chatapp.presentation.auth.LoginScreen
import com.chatapp.presentation.chat.ChatListScreen
import com.chatapp.presentation.chat.ChatScreen
import com.chatapp.presentation.qr.QrScannerScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object ChatList : Screen("chat_list")
    object Chat : Screen("chat/{chatId}") {
        fun createRoute(chatId: String) = "chat/$chatId"
    }
    object QrScanner : Screen("qr_scanner")
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
    }
}
