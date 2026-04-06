package com.chatapp.presentation.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.chatapp.presentation.biometric.BiometricHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onBusinessProfile: () -> Unit,
    onLinkedDevices: () -> Unit,
    onPrivacy: () -> Unit,
    onLogout: () -> Unit,
    onLabels: () -> Unit = {},
    onQuickReplies: () -> Unit = {},
    onProducts: () -> Unit = {},
    onAutoReplies: () -> Unit = {},
    onOrders: () -> Unit = {},
    onBroadcasts: () -> Unit = {},
    onNotifications: () -> Unit = {},
    onStorageData: () -> Unit = {},
    onHelp: () -> Unit = {},
    onChatBackup: () -> Unit = {},
    onContactSync: () -> Unit = {},
    userName: String = "User",
    phoneNumber: String = ""
) {
    val context = LocalContext.current
    val biometricAvailable = remember { BiometricHelper.isBiometricAvailable(context) }
    var biometricLockEnabled by remember { mutableStateOf(BiometricHelper.isBiometricEnabled(context)) }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A56DB),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Profile Section
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onBusinessProfile() }
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape),
                        color = Color(0xFF246BFD)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = userName.firstOrNull()?.toString() ?: "U",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 28.sp
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = userName,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp
                        )
                        if (phoneNumber.isNotEmpty()) {
                            Text(
                                text = phoneNumber,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontSize = 14.sp
                            )
                        }
                    }
                    Icon(
                        Icons.Default.QrCode,
                        contentDescription = "QR Code",
                        tint = Color(0xFF1A56DB)
                    )
                }
                Divider()
            }

            // Settings Items
            item {
                SettingsItem(
                    icon = Icons.Default.Business,
                    title = "Business Profile",
                    subtitle = "Edit your business information",
                    onClick = onBusinessProfile
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Devices,
                    title = "Linked Devices",
                    subtitle = "Manage devices connected to your account",
                    onClick = onLinkedDevices
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Lock,
                    title = "Privacy",
                    subtitle = "Read receipts, blocked contacts",
                    onClick = onPrivacy
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Label,
                    title = "Labels",
                    subtitle = "Organize chats with labels",
                    onClick = onLabels
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Reply,
                    title = "Quick Replies",
                    subtitle = "Create message shortcuts",
                    onClick = onQuickReplies
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Inventory,
                    title = "Product Catalog",
                    subtitle = "Manage your products",
                    onClick = onProducts
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Schedule,
                    title = "Auto-Reply Messages",
                    subtitle = "Set up greeting and away messages",
                    onClick = onAutoReplies
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.ShoppingCart,
                    title = "Orders",
                    subtitle = "View and manage customer orders",
                    onClick = onOrders
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Campaign,
                    title = "Broadcast Lists",
                    subtitle = "Send messages to multiple contacts",
                    onClick = onBroadcasts
                )
            }

            item {
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Notifications,
                    title = "Notifications",
                    subtitle = "Message and call notifications",
                    onClick = onNotifications
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Storage,
                    title = "Storage and Data",
                    subtitle = "Network usage, auto-download",
                    onClick = onStorageData
                )
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Help,
                    title = "Help",
                    subtitle = "Help center, contact us",
                    onClick = onHelp
                )
            }

            item {
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }

            // Biometric / Fingerprint Lock
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Fingerprint,
                        contentDescription = null,
                        tint = Color(0xFF1A56DB),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Fingerprint Lock", fontWeight = FontWeight.Medium, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface)
                        Text("Require fingerprint to open app", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(
                        checked = biometricLockEnabled,
                        enabled = biometricAvailable,
                        onCheckedChange = { newValue ->
                            if (newValue) {
                                // Authenticate before enabling
                                val activity = context as? FragmentActivity
                                if (activity != null) {
                                    BiometricHelper.authenticate(
                                        activity = activity,
                                        title = "Enable Fingerprint Lock",
                                        subtitle = "Verify your identity to enable fingerprint lock",
                                        onSuccess = {
                                            biometricLockEnabled = true
                                            BiometricHelper.setBiometricEnabled(context, true)
                                        },
                                        onError = { /* User cancelled or error */ }
                                    )
                                }
                            } else {
                                biometricLockEnabled = false
                                BiometricHelper.setBiometricEnabled(context, false)
                            }
                        },
                        colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF1A56DB))
                    )
                }
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Contacts,
                    title = "Contact Sync",
                    subtitle = "Sync your device contacts",
                    onClick = onContactSync
                )
            }

            item {
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }

            item {
                SettingsItem(
                    icon = Icons.Default.Logout,
                    title = "Logout",
                    subtitle = "Sign out of your account",
                    onClick = onLogout,
                    tint = Color.Red
                )
            }
        }
    }
}

@Composable
fun SettingsItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    tint: Color = Color(0xFF1A56DB)
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontWeight = FontWeight.Medium,
                fontSize = 16.sp,
                color = if (tint == Color.Red) Color.Red else MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = subtitle,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
