package com.app.abhichat.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("abhi_chat_prefs", 0) }
    val userName = prefs.getString("user_name", "User") ?: "User"
    val userPhone = prefs.getString("user_phone", "") ?: ""

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Profile Section
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        modifier = Modifier.size(64.dp),
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primary
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                userName.take(1).uppercase(),
                                color = Color.White,
                                fontSize = 26.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(userName, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(userPhone, color = Color.Gray, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(2.dp))
                        Text("Hey there! I am using Abhi Chat", color = Color.Gray, fontSize = 13.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Settings Items
            SettingsItem(
                icon = Icons.Default.Notifications,
                title = "Notifications",
                subtitle = "Message, group & call tones"
            )
            SettingsItem(
                icon = Icons.Default.Lock,
                title = "Privacy",
                subtitle = "Block contacts, disappearing messages"
            )
            SettingsItem(
                icon = Icons.Default.Security,
                title = "Security",
                subtitle = "Fingerprint lock, two-step verification"
            )
            SettingsItem(
                icon = Icons.Default.Palette,
                title = "Chat Themes",
                subtitle = "Theme, wallpaper, chat history"
            )
            SettingsItem(
                icon = Icons.Default.Storage,
                title = "Storage and Data",
                subtitle = "Network usage, auto-download"
            )
            SettingsItem(
                icon = Icons.Default.Language,
                title = "App Language",
                subtitle = "English (device's language)"
            )
            SettingsItem(
                icon = Icons.Default.Help,
                title = "Help",
                subtitle = "Help center, contact us, privacy policy"
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Logout
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onLogout),
                color = Color.White
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Logout,
                        contentDescription = null,
                        tint = Color.Red,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Text("Log Out", color = Color.Red, fontWeight = FontWeight.Medium, fontSize = 16.sp)
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Version
            Text(
                "Abhi Chat v2.0.0",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                color = Color.Gray,
                fontSize = 13.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

@Composable
fun SettingsItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit = {}
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = Color.White
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(title, fontWeight = FontWeight.Medium, fontSize = 16.sp)
                Text(subtitle, color = Color.Gray, fontSize = 13.sp)
            }
        }
    }
}
