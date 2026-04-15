package com.chatapp.presentation.navigation

import android.net.Uri
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
import com.chatapp.data.auth.AuthEvent
import com.chatapp.data.auth.AuthEventBus
import com.chatapp.presentation.auth.AuthViewModel
import com.chatapp.presentation.auth.LoginScreen
import com.chatapp.presentation.onboarding.SplashScreen
import com.chatapp.presentation.onboarding.OnboardingScreen
import com.chatapp.presentation.chat.ChatListScreen
import com.chatapp.presentation.chat.ChatListViewModel
import com.chatapp.presentation.chat.ChatScreen
import com.chatapp.presentation.chat.ChatSearchScreen
import com.chatapp.presentation.qr.QrScannerScreen
import com.chatapp.presentation.qr.QrViewModel
import com.chatapp.presentation.settings.SettingsScreen
import com.chatapp.presentation.settings.LinkedDevicesScreen
import com.chatapp.presentation.contacts.NewChatScreen
import com.chatapp.presentation.contacts.NewChatViewModel
import com.chatapp.presentation.contacts.ContactUser
import com.chatapp.presentation.calling.CallScreen
import com.chatapp.presentation.calling.IncomingCallViewModel
import com.chatapp.presentation.profile.UserProfileScreen
import com.chatapp.presentation.calls.CallHistoryScreen
import com.chatapp.presentation.settings.NotificationsScreen
import com.chatapp.presentation.settings.PrivacySettingsScreen
import com.chatapp.presentation.settings.ThemeSettingsScreen
import com.chatapp.presentation.settings.StorageDataScreen
import com.chatapp.presentation.settings.HelpScreen

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Onboarding : Screen("onboarding")
    object Login : Screen("login")
    object ChatList : Screen("chat_list")
    object Chat : Screen("chat/{chatId}?name={name}") {
        fun createRoute(chatId: String, name: String = "Chat") = "chat/$chatId?name=${Uri.encode(name)}"
    }
    object QrScanner : Screen("qr_scanner")
    object Settings : Screen("settings")
    object LinkedDevices : Screen("linked_devices")
    object NewChat : Screen("new_chat")
    object ChatSearch : Screen("chat_search")
    object VoiceCall : Screen("voice_call/{chatId}?callerName={callerName}&targetUserId={targetUserId}&isIncoming={isIncoming}") {
        fun createRoute(chatId: String, callerName: String, targetUserId: String = "", isIncoming: Boolean = false) = "voice_call/$chatId?callerName=${Uri.encode(callerName)}&targetUserId=${Uri.encode(targetUserId)}&isIncoming=$isIncoming"
    }
    object VideoCall : Screen("video_call/{chatId}?callerName={callerName}&targetUserId={targetUserId}&isIncoming={isIncoming}") {
        fun createRoute(chatId: String, callerName: String, targetUserId: String = "", isIncoming: Boolean = false) = "video_call/$chatId?callerName=${Uri.encode(callerName)}&targetUserId=${Uri.encode(targetUserId)}&isIncoming=$isIncoming"
    }
    object UserProfile : Screen("user_profile/{chatId}?name={name}") {
        fun createRoute(chatId: String, name: String = "User") = "user_profile/$chatId?name=${Uri.encode(name)}"
    }
    object CallHistory : Screen("call_history")
    object Notifications : Screen("notifications")
    object Privacy : Screen("privacy")
    object ThemeSettings : Screen("theme_settings")
    object StorageData : Screen("storage_data")
    object Help : Screen("help")
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val incomingCallViewModel: IncomingCallViewModel = hiltViewModel()
    val incomingCall by incomingCallViewModel.incomingCall.collectAsState()

    // Observe auth events — redirect to login when session expires
    LaunchedEffect(Unit) {
        AuthEventBus.events.collect { event ->
            when (event) {
                is AuthEvent.SessionExpired -> {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            }
        }
    }

    // Global incoming call handler — navigates to CallScreen when an incoming call arrives
    LaunchedEffect(incomingCall) {
        incomingCall?.let { call ->
            val currentRoute = navController.currentBackStackEntry?.destination?.route
            // Don't navigate if already on a call screen
            if (currentRoute?.startsWith("voice_call") == true || currentRoute?.startsWith("video_call") == true) {
                return@LaunchedEffect
            }
            val route = if (call.callType == "video") {
                Screen.VideoCall.createRoute(
                    chatId = call.chatId.ifEmpty { "incoming" },
                    callerName = call.callerName,
                    targetUserId = call.callerId,
                    isIncoming = true
                )
            } else {
                Screen.VoiceCall.createRoute(
                    chatId = call.chatId.ifEmpty { "incoming" },
                    callerName = call.callerName,
                    targetUserId = call.callerId,
                    isIncoming = true
                )
            }
            navController.navigate(route)
        }
    }

    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            val authViewModel: AuthViewModel = hiltViewModel()
            val authState by authViewModel.uiState.collectAsState()

            SplashScreen(
                onSplashFinished = {
                    if (authState.isLoggedIn) {
                        // User already logged in — skip onboarding and login
                        navController.navigate(Screen.ChatList.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Screen.Onboarding.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                }
            )
        }

        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onGetStarted = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                },
                onSkip = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }

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
            val chatListViewModel: ChatListViewModel = hiltViewModel()
            val chatListState by chatListViewModel.uiState.collectAsState()

            ChatListScreen(
                onChatClick = { chatId ->
                    val chatName = chatListState.chats.find { it.id == chatId }?.name ?: "Chat"
                    navController.navigate(Screen.Chat.createRoute(chatId, chatName))
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
                },
                onSearch = {
                    navController.navigate(Screen.ChatSearch.route)
                },
                onCallHistory = {
                    navController.navigate(Screen.CallHistory.route)
                }
            )
        }

        composable(
            route = Screen.Chat.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("name") { type = NavType.StringType; defaultValue = "Chat" }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: return@composable
            val chatName = backStackEntry.arguments?.getString("name") ?: "Chat"
            val chatListViewModel: ChatListViewModel = hiltViewModel(navController.getBackStackEntry(Screen.ChatList.route))
            val chatListState by chatListViewModel.uiState.collectAsState()
            ChatScreen(
                chatId = chatId,
                chatName = chatName,
                currentUserId = chatListState.currentUserId,
                onBack = {
                    chatListViewModel.refreshChats()
                    navController.popBackStack()
                },
                onCall = { targetUserId ->
                    navController.navigate(Screen.VoiceCall.createRoute(chatId, chatName, targetUserId))
                },
                onVideoCall = { targetUserId ->
                    navController.navigate(Screen.VideoCall.createRoute(chatId, chatName, targetUserId))
                },
                onProfileClick = { id ->
                    navController.navigate(Screen.UserProfile.createRoute(id, chatName))
                }
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
            val chatListViewModel: ChatListViewModel = hiltViewModel(navController.getBackStackEntry(Screen.ChatList.route))
            val chatListState by chatListViewModel.uiState.collectAsState()
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onLinkedDevices = { navController.navigate(Screen.LinkedDevices.route) },
                onNotifications = { navController.navigate(Screen.Notifications.route) },
                onPrivacy = { navController.navigate(Screen.Privacy.route) },
                onTheme = { navController.navigate(Screen.ThemeSettings.route) },
                onStorageData = { navController.navigate(Screen.StorageData.route) },
                onHelp = { navController.navigate(Screen.Help.route) },
                userName = chatListState.currentUserName,
                phoneNumber = chatListState.currentPhoneNumber,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Notifications.route) {
            NotificationsScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Privacy.route) {
            PrivacySettingsScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.ThemeSettings.route) {
            ThemeSettingsScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.StorageData.route) {
            StorageDataScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Help.route) {
            HelpScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.LinkedDevices.route) {
            LinkedDevicesScreen(
                onBack = { navController.popBackStack() },
                onLinkNewDevice = { navController.navigate(Screen.QrScanner.route) }
            )
        }

        composable(Screen.NewChat.route) {
            val newChatViewModel: NewChatViewModel = hiltViewModel()
            val newChatUiState by newChatViewModel.uiState.collectAsState()
            
            LaunchedEffect(newChatUiState.createdChatId) {
                newChatUiState.createdChatId?.let { chatId ->
                    navController.navigate(Screen.Chat.createRoute(chatId)) {
                        popUpTo(Screen.NewChat.route) { inclusive = true }
                    }
                    newChatViewModel.clearCreatedChatId()
                }
            }
            
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

        composable(Screen.ChatSearch.route) {
            ChatSearchScreen(
                onBack = { navController.popBackStack() },
                onChatClick = { chatId ->
                    navController.navigate(Screen.Chat.createRoute(chatId, "Chat"))
                }
            )
        }

        composable(
            route = Screen.UserProfile.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("name") { type = NavType.StringType; defaultValue = "User" }
            )
        ) { backStackEntry ->
            val profileChatId = backStackEntry.arguments?.getString("chatId") ?: return@composable
            val profileName = backStackEntry.arguments?.getString("name") ?: "User"
            UserProfileScreen(
                chatId = profileChatId,
                chatName = profileName,
                onBack = { navController.popBackStack() },
                onVoiceCall = {
                    navController.navigate(Screen.VoiceCall.createRoute(profileChatId, profileName))
                },
                onVideoCall = {
                    navController.navigate(Screen.VideoCall.createRoute(profileChatId, profileName))
                }
            )
        }

        composable(Screen.CallHistory.route) {
            CallHistoryScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Screen.VoiceCall.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("callerName") { type = NavType.StringType; defaultValue = "Unknown" },
                navArgument("targetUserId") { type = NavType.StringType; defaultValue = "" },
                navArgument("isIncoming") { type = NavType.BoolType; defaultValue = false }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            val callerName = backStackEntry.arguments?.getString("callerName") ?: "Unknown"
            val targetUserId = backStackEntry.arguments?.getString("targetUserId") ?: ""
            val isIncoming = backStackEntry.arguments?.getBoolean("isIncoming") ?: false
            CallScreen(
                callerName = callerName,
                callType = "voice",
                targetUserId = targetUserId,
                chatId = chatId,
                isIncoming = isIncoming,
                onEndCall = { navController.popBackStack() },
                onAcceptCall = {}
            )
        }

        composable(
            route = Screen.VideoCall.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("callerName") { type = NavType.StringType; defaultValue = "Unknown" },
                navArgument("targetUserId") { type = NavType.StringType; defaultValue = "" },
                navArgument("isIncoming") { type = NavType.BoolType; defaultValue = false }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            val callerName = backStackEntry.arguments?.getString("callerName") ?: "Unknown"
            val targetUserId = backStackEntry.arguments?.getString("targetUserId") ?: ""
            val isIncoming = backStackEntry.arguments?.getBoolean("isIncoming") ?: false
            CallScreen(
                callerName = callerName,
                callType = "video",
                targetUserId = targetUserId,
                chatId = chatId,
                isIncoming = isIncoming,
                onEndCall = { navController.popBackStack() },
                onAcceptCall = {}
            )
        }
    }
}
