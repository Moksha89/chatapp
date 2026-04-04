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
import com.chatapp.presentation.chat.ChatSearchScreen
import com.chatapp.presentation.qr.QrScannerScreen
import com.chatapp.presentation.qr.QrViewModel
import com.chatapp.presentation.settings.SettingsScreen
import com.chatapp.presentation.settings.PrivacySettingsScreen
import com.chatapp.presentation.settings.LinkedDevicesScreen
import com.chatapp.presentation.contacts.NewChatScreen
import com.chatapp.presentation.contacts.NewChatViewModel
import com.chatapp.presentation.contacts.ContactUser
import com.chatapp.presentation.group.CreateGroupScreen
import com.chatapp.presentation.business.BusinessProfileScreen
import com.chatapp.presentation.business.ProductsScreen
import com.chatapp.presentation.business.OrdersScreen
import com.chatapp.presentation.business.LabelsScreen
import com.chatapp.presentation.business.QuickRepliesScreen
import com.chatapp.presentation.business.BroadcastsScreen
import com.chatapp.presentation.business.AutoRepliesScreen
import com.chatapp.presentation.calling.CallScreen
import com.chatapp.presentation.backup.ChatBackupScreen
import com.chatapp.presentation.contacts.ContactSyncScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object ChatList : Screen("chat_list")
    object Chat : Screen("chat/{chatId}") {
        fun createRoute(chatId: String) = "chat/$chatId"
    }
    object QrScanner : Screen("qr_scanner")
    object Settings : Screen("settings")
    object Privacy : Screen("privacy")
    object LinkedDevices : Screen("linked_devices")
    object NewChat : Screen("new_chat")
    object CreateGroup : Screen("create_group/{type}") {
        fun createRoute(type: String = "group") = "create_group/$type"
    }
    object BusinessProfile : Screen("business_profile")
    object Products : Screen("products")
    object Orders : Screen("orders")
    object Labels : Screen("labels")
    object QuickReplies : Screen("quick_replies")
    object Broadcasts : Screen("broadcasts")
    object AutoReplies : Screen("auto_replies")
    object ChatSearch : Screen("chat_search")
    object VoiceCall : Screen("voice_call/{chatId}/{callerName}") {
        fun createRoute(chatId: String, callerName: String) = "voice_call/$chatId/$callerName"
    }
    object VideoCall : Screen("video_call/{chatId}/{callerName}") {
        fun createRoute(chatId: String, callerName: String) = "video_call/$chatId/$callerName"
    }
    object ChatBackup : Screen("chat_backup")
    object ContactSync : Screen("contact_sync")
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
                },
                onCreateGroup = { type ->
                    navController.navigate(Screen.CreateGroup.createRoute(type))
                },
                onSearch = {
                    navController.navigate(Screen.ChatSearch.route)
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
                onBack = { navController.popBackStack() },
                onCall = { id ->
                    navController.navigate(Screen.VoiceCall.createRoute(id, "Contact"))
                },
                onVideoCall = { id ->
                    navController.navigate(Screen.VideoCall.createRoute(id, "Contact"))
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
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onBusinessProfile = { navController.navigate(Screen.BusinessProfile.route) },
                onLinkedDevices = { navController.navigate(Screen.LinkedDevices.route) },
                onPrivacy = { navController.navigate(Screen.Privacy.route) },
                onLabels = { navController.navigate(Screen.Labels.route) },
                onQuickReplies = { navController.navigate(Screen.QuickReplies.route) },
                onProducts = { navController.navigate(Screen.Products.route) },
                onAutoReplies = { navController.navigate(Screen.AutoReplies.route) },
                onOrders = { navController.navigate(Screen.Orders.route) },
                onBroadcasts = { navController.navigate(Screen.Broadcasts.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.LinkedDevices.route) {
            LinkedDevicesScreen(
                onBack = { navController.popBackStack() },
                onLinkNewDevice = { navController.navigate(Screen.QrScanner.route) }
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

        // Create Group / Channel / Community
        composable(
            route = Screen.CreateGroup.route,
            arguments = listOf(navArgument("type") { type = NavType.StringType; defaultValue = "group" })
        ) { backStackEntry ->
            val type = backStackEntry.arguments?.getString("type") ?: "group"
            CreateGroupScreen(
                onBack = { navController.popBackStack() },
                onGroupCreated = { chatId ->
                    navController.navigate(Screen.Chat.createRoute(chatId)) {
                        popUpTo(Screen.ChatList.route)
                    }
                },
                chatType = type
            )
        }

        composable(Screen.BusinessProfile.route) {
            BusinessProfileScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Products.route) {
            ProductsScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Orders.route) {
            OrdersScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Labels.route) {
            LabelsScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.QuickReplies.route) {
            QuickRepliesScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Broadcasts.route) {
            BroadcastsScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.AutoReplies.route) {
            AutoRepliesScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.ChatSearch.route) {
            ChatSearchScreen(
                onBack = { navController.popBackStack() },
                onChatClick = { chatId ->
                    navController.navigate(Screen.Chat.createRoute(chatId))
                }
            )
        }

        composable(Screen.ChatBackup.route) {
            ChatBackupScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.ContactSync.route) {
            ContactSyncScreen(
                onBack = { navController.popBackStack() },
                onContactClick = { contactId ->
                    navController.navigate(Screen.Chat.createRoute(contactId))
                }
            )
        }

        composable(
            route = Screen.VoiceCall.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("callerName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val callerName = backStackEntry.arguments?.getString("callerName") ?: "Unknown"
            CallScreen(
                callerName = callerName,
                callType = "voice",
                onEndCall = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.VideoCall.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("callerName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val callerName = backStackEntry.arguments?.getString("callerName") ?: "Unknown"
            CallScreen(
                callerName = callerName,
                callType = "video",
                onEndCall = { navController.popBackStack() }
            )
        }
    }
}
