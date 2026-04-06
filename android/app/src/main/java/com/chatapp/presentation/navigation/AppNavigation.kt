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
import com.chatapp.presentation.settings.PrivacySettingsScreen
import com.chatapp.presentation.settings.LinkedDevicesScreen
import com.chatapp.presentation.contacts.NewChatScreen
import com.chatapp.presentation.contacts.NewChatViewModel
import com.chatapp.presentation.contacts.ContactUser
import com.chatapp.presentation.group.CreateGroupScreen
import com.chatapp.presentation.group.GroupInfoScreen
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
import com.chatapp.presentation.settings.NotificationsScreen
import com.chatapp.presentation.settings.StorageDataScreen
import com.chatapp.presentation.settings.HelpScreen
import com.chatapp.presentation.profile.UserProfileScreen

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
    object VoiceCall : Screen("voice_call/{chatId}?callerName={callerName}") {
        fun createRoute(chatId: String, callerName: String) = "voice_call/$chatId?callerName=${Uri.encode(callerName)}"
    }
    object VideoCall : Screen("video_call/{chatId}?callerName={callerName}") {
        fun createRoute(chatId: String, callerName: String) = "video_call/$chatId?callerName=${Uri.encode(callerName)}"
    }
    object UserProfile : Screen("user_profile/{chatId}?name={name}") {
        fun createRoute(chatId: String, name: String = "User") = "user_profile/$chatId?name=${Uri.encode(name)}"
    }
    object ChatBackup : Screen("chat_backup")
    object ContactSync : Screen("contact_sync")
    object Notifications : Screen("notifications")
    object StorageData : Screen("storage_data")
    object Help : Screen("help")
    object GroupInfo : Screen("group_info/{chatId}?name={name}") {
        fun createRoute(chatId: String, name: String = "Group") = "group_info/$chatId?name=${Uri.encode(name)}"
    }
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onSplashFinished = {
                    navController.navigate(Screen.Onboarding.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
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
                onBack = { navController.popBackStack() },
                onCall = { id ->
                    navController.navigate(Screen.VoiceCall.createRoute(id, chatName))
                },
                onVideoCall = { id ->
                    navController.navigate(Screen.VideoCall.createRoute(id, chatName))
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
                onBusinessProfile = { navController.navigate(Screen.BusinessProfile.route) },
                onLinkedDevices = { navController.navigate(Screen.LinkedDevices.route) },
                onPrivacy = { navController.navigate(Screen.Privacy.route) },
                onLabels = { navController.navigate(Screen.Labels.route) },
                onQuickReplies = { navController.navigate(Screen.QuickReplies.route) },
                onProducts = { navController.navigate(Screen.Products.route) },
                onAutoReplies = { navController.navigate(Screen.AutoReplies.route) },
                onOrders = { navController.navigate(Screen.Orders.route) },
                onBroadcasts = { navController.navigate(Screen.Broadcasts.route) },
                onNotifications = { navController.navigate(Screen.Notifications.route) },
                onStorageData = { navController.navigate(Screen.StorageData.route) },
                onHelp = { navController.navigate(Screen.Help.route) },
                onChatBackup = { navController.navigate(Screen.ChatBackup.route) },
                onContactSync = { navController.navigate(Screen.ContactSync.route) },
                userName = chatListState.currentUserName,
                phoneNumber = chatListState.currentPhoneNumber,
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
                    navController.navigate(Screen.Chat.createRoute(chatId, "Chat"))
                }
            )
        }

        composable(Screen.ChatBackup.route) {
            ChatBackupScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Notifications.route) {
            NotificationsScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.StorageData.route) {
            StorageDataScreen(onBack = { navController.popBackStack() })
        }

        composable(Screen.Help.route) {
            HelpScreen(onBack = { navController.popBackStack() })
        }

        composable(
            route = Screen.GroupInfo.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("name") { type = NavType.StringType; defaultValue = "Group" }
            )
        ) { backStackEntry ->
            val groupChatId = backStackEntry.arguments?.getString("chatId") ?: return@composable
            val gName = backStackEntry.arguments?.getString("name") ?: "Group"
            GroupInfoScreen(
                chatId = groupChatId,
                groupName = gName,
                onBack = { navController.popBackStack() },
                onAddMembers = { },
                onChatClick = { id ->
                    navController.navigate(Screen.Chat.createRoute(id))
                }
            )
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

        composable(
            route = Screen.VoiceCall.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("callerName") { type = NavType.StringType; defaultValue = "Unknown" }
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
                navArgument("callerName") { type = NavType.StringType; defaultValue = "Unknown" }
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
