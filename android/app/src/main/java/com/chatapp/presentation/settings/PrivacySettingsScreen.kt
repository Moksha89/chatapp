package com.chatapp.presentation.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class BlockedUser(
    val id: String,
    val displayName: String,
    val phoneNumber: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacySettingsScreen(
    onBack: () -> Unit,
    readReceiptsEnabled: Boolean,
    onReadReceiptsToggle: (Boolean) -> Unit,
    blockedUsers: List<BlockedUser>,
    onUnblockUser: (String) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Privacy") },
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
            // Read Receipts Section
            item {
                Text(
                    text = "Messages",
                    color = Color(0xFF128C7E),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 8.dp)
                )
            }

            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onReadReceiptsToggle(!readReceiptsEnabled) }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Read Receipts",
                            fontWeight = FontWeight.Medium,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "If turned off, you won't send or receive read receipts. Read receipts are always sent for group chats.",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                    Switch(
                        checked = readReceiptsEnabled,
                        onCheckedChange = onReadReceiptsToggle,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = Color(0xFF25D366)
                        )
                    )
                }
            }

            item {
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }

            // Blocked Users Section
            item {
                Text(
                    text = "Blocked Contacts",
                    color = Color(0xFF128C7E),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                )
            }

            if (blockedUsers.isEmpty()) {
                item {
                    Text(
                        text = "No blocked contacts",
                        color = Color.Gray,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                    )
                }
            } else {
                items(blockedUsers) { user ->
                    BlockedUserItem(
                        user = user,
                        onUnblock = { onUnblockUser(user.id) }
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
            }

            item {
                Text(
                    text = "Blocked contacts will no longer be able to call you or send you messages.",
                    color = Color.Gray,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
        }
    }
}

@Composable
fun BlockedUserItem(
    user: BlockedUser,
    onUnblock: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape),
            color = Color(0xFF25D366)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = user.displayName.firstOrNull()?.toString() ?: "U",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = user.displayName,
                fontWeight = FontWeight.Medium,
                fontSize = 16.sp
            )
            Text(
                text = user.phoneNumber,
                fontSize = 14.sp,
                color = Color.Gray
            )
        }
        TextButton(onClick = onUnblock) {
            Text(
                text = "Unblock",
                color = Color(0xFF128C7E)
            )
        }
    }
}
