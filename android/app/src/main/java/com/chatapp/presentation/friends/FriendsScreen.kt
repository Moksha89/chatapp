package com.chatapp.presentation.friends

import androidx.compose.foundation.background
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
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsScreen(
    onBack: () -> Unit,
    viewModel: FriendsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadFriends() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Friends") },
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
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    if (uiState.pendingRequests.isNotEmpty()) {
                        item {
                            Text(
                                "Friend Requests (${uiState.pendingRequests.size})",
                                modifier = Modifier.padding(16.dp),
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }
                        items(uiState.pendingRequests) { request ->
                            ListItem(
                                headlineContent = { Text(request.sender?.displayName ?: "Unknown") },
                                supportingContent = { Text(request.sender?.phoneNumber ?: "") },
                                leadingContent = {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.tertiaryContainer),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text((request.sender?.displayName ?: "?").take(1).uppercase(), fontWeight = FontWeight.Bold)
                                    }
                                },
                                trailingContent = {
                                    Row {
                                        IconButton(onClick = { viewModel.acceptRequest(request.id) }) {
                                            Icon(Icons.Default.Check, contentDescription = "Accept", tint = Color(0xFF4CAF50))
                                        }
                                        IconButton(onClick = { viewModel.declineRequest(request.id) }) {
                                            Icon(Icons.Default.Close, contentDescription = "Decline", tint = Color(0xFFF44336))
                                        }
                                    }
                                }
                            )
                        }
                        item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }
                    }

                    if (uiState.suggestions.isNotEmpty()) {
                        item {
                            Text(
                                "Suggestions",
                                modifier = Modifier.padding(16.dp),
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }
                        items(uiState.suggestions) { user ->
                            ListItem(
                                headlineContent = { Text(user.displayName) },
                                supportingContent = { Text(user.phoneNumber) },
                                leadingContent = {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.secondaryContainer),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(user.displayName.take(1).uppercase(), fontWeight = FontWeight.Bold)
                                    }
                                },
                                trailingContent = {
                                    Icon(Icons.Default.PersonAdd, contentDescription = "Add Friend")
                                }
                            )
                        }
                        item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }
                    }

                    item {
                        Text(
                            "My Friends (${uiState.friends.size})",
                            modifier = Modifier.padding(16.dp),
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }

                    if (uiState.friends.isEmpty()) {
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(Icons.Default.People, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("No friends yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }

                    items(uiState.friends) { friend ->
                        val friendUser = friend.friend ?: friend.user
                        ListItem(
                            headlineContent = { Text(friendUser?.displayName ?: "Unknown") },
                            supportingContent = { Text(friendUser?.phoneNumber ?: "") },
                            leadingContent = {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primaryContainer),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text((friendUser?.displayName ?: "?").take(1).uppercase(), fontWeight = FontWeight.Bold)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}
