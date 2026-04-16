package com.app.abhichat.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.app.abhichat.data.api.ApiClient
import com.app.abhichat.data.model.ChatItem
import com.app.abhichat.data.model.CreateChatRequest
import com.app.abhichat.data.model.User
import com.app.abhichat.data.repository.AuthRepository
import com.app.abhichat.service.SocketManager
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatListScreen(
    authRepo: AuthRepository,
    onChatClick: (String) -> Unit,
    onScanQr: () -> Unit,
    onLogout: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var chats by remember { mutableStateOf<List<ChatItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var showNewChatDialog by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    fun loadChats() {
        scope.launch {
            try {
                chats = ApiClient.getService().getChats()
            } catch (e: Exception) {
                android.util.Log.e("ChatList", "Failed to load chats", e)
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadChats()

        SocketManager.on("message:new") {
            loadChats()
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            SocketManager.off("message:new")
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "ChatApp",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                ),
                navigationIcon = {
                    Icon(
                        Icons.Default.Chat,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.padding(start = 12.dp)
                    )
                },
                actions = {
                    IconButton(onClick = onScanQr) {
                        Icon(
                            Icons.Default.QrCodeScanner,
                            contentDescription = "Scan QR",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = { showNewChatDialog = true }) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "New Chat",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = {
                        scope.launch {
                            authRepo.logout()
                            onLogout()
                        }
                    }) {
                        Icon(
                            Icons.Default.Logout,
                            contentDescription = "Logout",
                            tint = Color.White
                        )
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            } else if (chats.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.Chat,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color.LightGray
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "No chats yet",
                        fontWeight = FontWeight.Medium,
                        color = Color.Gray
                    )
                    Text(
                        "Tap + to start a new conversation",
                        fontSize = 13.sp,
                        color = Color.LightGray,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            } else {
                // Search bar
                Column {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search chats...", fontSize = 14.sp) },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                                tint = Color.Gray
                            )
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color(0xFFE0E0E0),
                            focusedBorderColor = MaterialTheme.colorScheme.primary
                        )
                    )

                    val filtered = chats.filter {
                        if (searchQuery.isBlank()) true
                        else {
                            val name = it.otherUser?.displayName ?: ""
                            val phone = it.otherUser?.phone ?: ""
                            name.contains(searchQuery, ignoreCase = true) ||
                                    phone.contains(searchQuery)
                        }
                    }

                    LazyColumn {
                        items(filtered) { chat ->
                            ChatListItem(
                                chat = chat,
                                onClick = { onChatClick(chat.id) }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showNewChatDialog) {
        NewChatDialog(
            onDismiss = { showNewChatDialog = false },
            onChatCreated = { chatId ->
                showNewChatDialog = false
                onChatClick(chatId)
            }
        )
    }
}

@Composable
private fun ChatListItem(chat: ChatItem, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar
        Box(modifier = Modifier.size(52.dp)) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                shape = CircleShape,
                color = Color(0xFFD1E4FF)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
            if (chat.otherUser?.isOnline == true) {
                Surface(
                    modifier = Modifier
                        .size(14.dp)
                        .align(Alignment.BottomEnd),
                    shape = CircleShape,
                    color = Color(0xFF4CAF50),
                    shadowElevation = 2.dp
                ) {}
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = chat.otherUser?.displayName ?: chat.otherUser?.phone ?: "Unknown",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                chat.lastMessage?.let {
                    Text(
                        text = formatChatTime(it.createdAt),
                        fontSize = 12.sp,
                        color = if (chat.unreadCount > 0) MaterialTheme.colorScheme.primary else Color.Gray
                    )
                }
            }

            Spacer(modifier = Modifier.height(2.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = chat.lastMessage?.content ?: "No messages yet",
                    fontSize = 13.sp,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                if (chat.unreadCount > 0) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(start = 8.dp)
                    ) {
                        Text(
                            text = chat.unreadCount.toString(),
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }

    HorizontalDivider(
        modifier = Modifier.padding(start = 80.dp),
        color = Color(0xFFF0F0F0)
    )
}

@Composable
private fun NewChatDialog(
    onDismiss: () -> Unit,
    onChatCreated: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var searchPhone by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<User>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    var hasSearched by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    "New Chat",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = searchPhone,
                        onValueChange = { searchPhone = it },
                        placeholder = { Text("Phone number", fontSize = 14.sp) },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    Button(
                        onClick = {
                            if (searchPhone.isBlank()) return@Button
                            scope.launch {
                                searching = true
                                hasSearched = false
                                try {
                                    searchResults = ApiClient.getService()
                                        .searchUsers(searchPhone.trim())
                                } catch (_: Exception) {
                                    searchResults = emptyList()
                                } finally {
                                    searching = false
                                    hasSearched = true
                                }
                            }
                        },
                        shape = RoundedCornerShape(12.dp),
                        enabled = !searching && searchPhone.isNotBlank()
                    ) {
                        Text("Search")
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (searching) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                }

                searchResults.forEach { user ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                scope.launch {
                                    try {
                                        val response = ApiClient
                                            .getService()
                                            .createChat(CreateChatRequest(user.id))
                                        onChatCreated(response.chatId)
                                    } catch (e: Exception) {
                                        android.util.Log.e("NewChat", "Failed to create chat", e)
                                    }
                                }
                            }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            modifier = Modifier.size(40.dp),
                            shape = CircleShape,
                            color = Color(0xFFD1E4FF)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                user.displayName ?: user.phone,
                                fontWeight = FontWeight.Medium,
                                fontSize = 14.sp
                            )
                            Text(
                                user.phone,
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        }
                    }
                }

                if (!searching && hasSearched && searchResults.isEmpty()) {
                    Text(
                        "No users found",
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        color = Color.Gray,
                        fontSize = 14.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Cancel")
                }
            }
        }
    }
}

private fun formatChatTime(dateStr: String): String {
    return try {
        val formats = listOf(
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US),
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US),
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        )
        formats.forEach { it.timeZone = TimeZone.getTimeZone("UTC") }

        var date: Date? = null
        for (fmt in formats) {
            try { date = fmt.parse(dateStr); break } catch (_: Exception) {}
        }
        if (date == null) return dateStr

        val now = Date()
        val diff = now.time - date.time

        when {
            diff < 86_400_000 -> SimpleDateFormat("h:mm a", Locale.getDefault()).format(date)
            diff < 604_800_000 -> SimpleDateFormat("EEE", Locale.getDefault()).format(date)
            else -> SimpleDateFormat("MMM d", Locale.getDefault()).format(date)
        }
    } catch (_: Exception) {
        dateStr
    }
}
