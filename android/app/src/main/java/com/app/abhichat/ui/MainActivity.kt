package com.app.abhichat.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.app.abhichat.data.api.ApiClient
import com.app.abhichat.data.repository.AuthRepository
import com.app.abhichat.service.SocketManager
import com.app.abhichat.ui.screens.ChatListScreen
import com.app.abhichat.ui.screens.ChatScreen
import com.app.abhichat.ui.screens.LoginScreen
import com.app.abhichat.ui.screens.QrScannerScreen
import com.app.abhichat.ui.theme.ChatAppTheme

class MainActivity : ComponentActivity() {
    private lateinit var authRepo: AuthRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        authRepo = AuthRepository(this)

        setContent {
            ChatAppTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val navController = rememberNavController()
                    var isLoggedIn by remember { mutableStateOf<Boolean?>(null) }

                    LaunchedEffect(Unit) {
                        isLoggedIn = authRepo.initToken()
                        if (isLoggedIn == true) {
                            SocketManager.connect()
                        }
                    }

                    when (isLoggedIn) {
                        null -> {} // Loading
                        false -> {
                            NavHost(navController = navController, startDestination = "login") {
                                composable("login") {
                                    LoginScreen(
                                        authRepo = authRepo,
                                        onLoginSuccess = {
                                            isLoggedIn = true
                                            SocketManager.connect()
                                        }
                                    )
                                }
                            }
                        }
                        true -> {
                            NavHost(navController = navController, startDestination = "chatList") {
                                composable("chatList") {
                                    ChatListScreen(
                                        authRepo = authRepo,
                                        onChatClick = { chatId ->
                                            navController.navigate("chat/$chatId")
                                        },
                                        onScanQr = {
                                            navController.navigate("qrScanner")
                                        },
                                        onLogout = {
                                            SocketManager.disconnect()
                                            isLoggedIn = false
                                        }
                                    )
                                }
                                composable("chat/{chatId}") { backStackEntry ->
                                    val chatId = backStackEntry.arguments?.getString("chatId") ?: return@composable
                                    ChatScreen(
                                        chatId = chatId,
                                        onBack = { navController.popBackStack() }
                                    )
                                }
                                composable("qrScanner") {
                                    QrScannerScreen(
                                        onBack = { navController.popBackStack() }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        SocketManager.disconnect()
    }
}
