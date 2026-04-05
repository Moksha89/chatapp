package com.chatapp.presentation.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UserProfileScreen(
    chatId: String,
    chatName: String,
    onBack: () -> Unit,
    onVoiceCall: () -> Unit = {},
    onVideoCall: () -> Unit = {},
    onSearch: () -> Unit = {},
    onMute: () -> Unit = {},
    onBlock: () -> Unit = {}
) {
    var isMuted by remember { mutableStateOf(false) }
    var isBlocked by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Contact Info") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A56DB),
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .background(Color(0xFFF7F8FC))
        ) {
            // Profile header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    modifier = Modifier
                        .size(100.dp)
                        .clip(CircleShape),
                    color = Color(0xFF246BFD)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = chatName.firstOrNull()?.toString() ?: "?",
                            color = Color.White,
                            fontSize = 40.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = chatName,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1A1A2E)
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = "Online",
                    fontSize = 14.sp,
                    color = Color(0xFF246BFD)
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Action buttons row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    ProfileActionButton(
                        icon = Icons.Default.Call,
                        label = "Audio",
                        onClick = onVoiceCall
                    )
                    ProfileActionButton(
                        icon = Icons.Default.Videocam,
                        label = "Video",
                        onClick = onVideoCall
                    )
                    ProfileActionButton(
                        icon = Icons.Default.Search,
                        label = "Search",
                        onClick = onSearch
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // About section
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "About",
                        fontSize = 14.sp,
                        color = Color(0xFF6B7280)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Hey there! I'm using Abhi",
                        fontSize = 16.sp,
                        color = Color(0xFF1A1A2E)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Media, Links, Docs
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Media, Links and Docs",
                        fontSize = 16.sp,
                        color = Color(0xFF1A1A2E)
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "0",
                            fontSize = 14.sp,
                            color = Color(0xFF6B7280)
                        )
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = Color(0xFF6B7280)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Notifications & Media visibility
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Mute Notifications",
                                fontSize = 16.sp,
                                color = Color(0xFF1A1A2E)
                            )
                        }
                        Switch(
                            checked = isMuted,
                            onCheckedChange = {
                                isMuted = it
                                onMute()
                            },
                            colors = SwitchDefaults.colors(
                                checkedTrackColor = Color(0xFF246BFD)
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Media Visibility",
                            fontSize = 16.sp,
                            color = Color(0xFF1A1A2E)
                        )
                        Text(
                            text = "Default",
                            fontSize = 14.sp,
                            color = Color(0xFF6B7280)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Encryption
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Lock,
                        contentDescription = null,
                        tint = Color(0xFF6B7280),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            text = "Encryption",
                            fontSize = 16.sp,
                            color = Color(0xFF1A1A2E)
                        )
                        Text(
                            text = "Messages are end-to-end encrypted. Tap to verify.",
                            fontSize = 13.sp,
                            color = Color(0xFF6B7280)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Block / Report
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Block,
                            contentDescription = null,
                            tint = Color.Red,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        TextButton(onClick = {
                            isBlocked = !isBlocked
                            onBlock()
                        }) {
                            Text(
                                text = if (isBlocked) "Unblock $chatName" else "Block $chatName",
                                color = Color.Red,
                                fontSize = 16.sp
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.ThumbDown,
                            contentDescription = null,
                            tint = Color.Red,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        TextButton(onClick = { }) {
                            Text(
                                text = "Report $chatName",
                                color = Color.Red,
                                fontSize = 16.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun ProfileActionButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(
            onClick = onClick,
            modifier = Modifier
                .size(48.dp)
                .background(Color(0xFFE8F0FE), CircleShape)
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = Color(0xFF246BFD),
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            color = Color(0xFF246BFD)
        )
    }
}
