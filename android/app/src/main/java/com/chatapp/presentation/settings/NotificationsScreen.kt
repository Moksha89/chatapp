package com.chatapp.presentation.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onBack: () -> Unit
) {
    var messageNotifications by remember { mutableStateOf(true) }
    var groupNotifications by remember { mutableStateOf(true) }
    var callNotifications by remember { mutableStateOf(true) }
    var vibrate by remember { mutableStateOf(true) }
    var highPriority by remember { mutableStateOf(false) }
    var showPreview by remember { mutableStateOf(true) }
    var reactionNotifications by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF128C7E),
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
            // Message Notifications
            item {
                Text(
                    text = "Message Notifications",
                    color = Color(0xFF128C7E),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 8.dp)
                )
            }

            item {
                NotificationToggle(
                    title = "Message Notifications",
                    subtitle = "Show notifications for new messages",
                    checked = messageNotifications,
                    onCheckedChange = { messageNotifications = it }
                )
            }

            item {
                NotificationToggle(
                    title = "Show Preview",
                    subtitle = "Display message content in notifications",
                    checked = showPreview,
                    onCheckedChange = { showPreview = it }
                )
            }

            item {
                NotificationToggle(
                    title = "Reaction Notifications",
                    subtitle = "Notify when someone reacts to your messages",
                    checked = reactionNotifications,
                    onCheckedChange = { reactionNotifications = it }
                )
            }

            item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }

            // Group Notifications
            item {
                Text(
                    text = "Group Notifications",
                    color = Color(0xFF128C7E),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                )
            }

            item {
                NotificationToggle(
                    title = "Group Notifications",
                    subtitle = "Show notifications for group messages",
                    checked = groupNotifications,
                    onCheckedChange = { groupNotifications = it }
                )
            }

            item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }

            // Call Notifications
            item {
                Text(
                    text = "Calls",
                    color = Color(0xFF128C7E),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                )
            }

            item {
                NotificationToggle(
                    title = "Call Notifications",
                    subtitle = "Show notifications for incoming calls",
                    checked = callNotifications,
                    onCheckedChange = { callNotifications = it }
                )
            }

            item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }

            // General
            item {
                Text(
                    text = "General",
                    color = Color(0xFF128C7E),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                )
            }

            item {
                NotificationToggle(
                    title = "Vibrate",
                    subtitle = "Vibrate when notification arrives",
                    checked = vibrate,
                    onCheckedChange = { vibrate = it }
                )
            }

            item {
                NotificationToggle(
                    title = "High Priority",
                    subtitle = "Show notifications at the top",
                    checked = highPriority,
                    onCheckedChange = { highPriority = it }
                )
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Notification settings are saved locally on this device.",
                    color = Color.Gray,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun NotificationToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontWeight = FontWeight.Medium,
                fontSize = 16.sp
            )
            Text(
                text = subtitle,
                fontSize = 14.sp,
                color = Color.Gray
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = Color(0xFF25D366)
            )
        )
    }
}
