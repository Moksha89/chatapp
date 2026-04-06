package com.chatapp.presentation.chat

import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatListScreen(
    onChatClick: (String) -> Unit,
    onLogout: () -> Unit,
    onScanQr: () -> Unit = {},
    onSettings: () -> Unit = {},
    onNewChat: () -> Unit = {},
    onCreateGroup: (String) -> Unit = {},
    onSearch: () -> Unit = {},
    onAddFriend: () -> Unit = {},
    viewModel: ChatListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("All", "Groups", "Channels", "Labels")

    // + menu state
    var showPlusMenu by remember { mutableStateOf(false) }

    // Bottom nav state
    var selectedBottomTab by remember { mutableIntStateOf(0) }

    // Long-press menu state
    var longPressedChat by remember { mutableStateOf<ChatSummary?>(null) }
    var showLabelDialog by remember { mutableStateOf(false) }
    var showCreateLabelDialog by remember { mutableStateOf(false) }
    var newLabelName by remember { mutableStateOf("") }
    
    // Show error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    // Long-press chat options dialog
    if (longPressedChat != null) {
        ChatOptionsDialog(
            chat = longPressedChat!!,
            labels = uiState.labels,
            onDismiss = { longPressedChat = null },
            onPin = {
                viewModel.togglePin(longPressedChat!!.id)
                Toast.makeText(context, if (longPressedChat!!.isPinned) "Unpinned" else "Pinned", Toast.LENGTH_SHORT).show()
                longPressedChat = null
            },
            onMute = {
                viewModel.toggleMute(longPressedChat!!.id)
                Toast.makeText(context, if (longPressedChat!!.isMuted) "Unmuted" else "Muted", Toast.LENGTH_SHORT).show()
                longPressedChat = null
            },
            onArchive = {
                viewModel.toggleArchive(longPressedChat!!.id)
                Toast.makeText(context, if (longPressedChat!!.isArchived) "Unarchived" else "Archived", Toast.LENGTH_SHORT).show()
                longPressedChat = null
            },
            onDelete = {
                viewModel.deleteChat(longPressedChat!!.id)
                Toast.makeText(context, "Chat deleted", Toast.LENGTH_SHORT).show()
                longPressedChat = null
            },
            onBlock = {
                viewModel.toggleBlock(longPressedChat!!.id)
                Toast.makeText(context, if (longPressedChat!!.isBlocked) "Unblocked" else "Blocked", Toast.LENGTH_SHORT).show()
                longPressedChat = null
            },
            onReport = {
                Toast.makeText(context, "Chat reported", Toast.LENGTH_SHORT).show()
                longPressedChat = null
            },
            onLabel = {
                showLabelDialog = true
            }
        )
    }

    // Label assignment dialog
    if (showLabelDialog && longPressedChat != null) {
        LabelAssignDialog(
            chatId = longPressedChat!!.id,
            labels = uiState.labels,
            assignedLabels = longPressedChat!!.labels,
            onDismiss = { showLabelDialog = false; longPressedChat = null },
            onToggleLabel = { labelId ->
                if (longPressedChat!!.labels.contains(labelId)) {
                    viewModel.removeLabelFromChat(longPressedChat!!.id, labelId)
                } else {
                    viewModel.addLabelToChat(longPressedChat!!.id, labelId)
                }
            },
            onCreateNew = { showCreateLabelDialog = true }
        )
    }

    // Create new label dialog
    if (showCreateLabelDialog) {
        AlertDialog(
            onDismissRequest = { showCreateLabelDialog = false; newLabelName = "" },
            title = { Text("New Label") },
            text = {
                OutlinedTextField(
                    value = newLabelName,
                    onValueChange = { newLabelName = it },
                    label = { Text("Label name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    if (newLabelName.isNotBlank()) {
                        viewModel.createLabel(newLabelName)
                        Toast.makeText(context, "Label created", Toast.LENGTH_SHORT).show()
                        newLabelName = ""
                        showCreateLabelDialog = false
                    }
                }) { Text("Create", color = Color(0xFF246BFD)) }
            },
            dismissButton = {
                TextButton(onClick = { showCreateLabelDialog = false; newLabelName = "" }) { Text("Cancel") }
            }
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Text(
                            "Abhi",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color(0xFF246BFD),
                        titleContentColor = Color.White
                    ),
                    actions = {
                        IconButton(onClick = onSearch) {
                            Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.White)
                        }
                        // + button with Add Friend / Create Group popup
                        Box {
                            IconButton(onClick = { showPlusMenu = true }) {
                                Icon(Icons.Default.Add, contentDescription = "Add", tint = Color.White)
                            }
                            DropdownMenu(
                                expanded = showPlusMenu,
                                onDismissRequest = { showPlusMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Add Friend") },
                                    onClick = { showPlusMenu = false; onAddFriend() },
                                    leadingIcon = { Icon(Icons.Default.PersonAdd, contentDescription = null, tint = Color(0xFF246BFD)) }
                                )
                                DropdownMenuItem(
                                    text = { Text("Create Group") },
                                    onClick = { showPlusMenu = false; onCreateGroup("group") },
                                    leadingIcon = { Icon(Icons.Default.GroupAdd, contentDescription = null, tint = Color(0xFF246BFD)) }
                                )
                            }
                        }
                    }
                )
                // Tab Row
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color(0xFF246BFD),
                    contentColor = Color.White,
                    modifier = Modifier.background(Color(0xFF246BFD)),
                    indicator = @Composable { tabPositions ->
                        TabRowDefaults.Indicator(
                            modifier = Modifier.fillMaxWidth(),
                            color = Color.White
                        )
                    }
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            selectedContentColor = Color.White,
                            unselectedContentColor = Color.White.copy(alpha = 0.7f),
                            text = {
                                Text(
                                    text = title,
                                    fontSize = 13.sp,
                                    fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal,
                                    color = if (selectedTab == index) Color.White else Color.White.copy(alpha = 0.7f)
                                )
                            }
                        )
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color.White,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Chat, contentDescription = "Chats") },
                    label = { Text("Chats", fontSize = 11.sp) },
                    selected = selectedBottomTab == 0,
                    onClick = { selectedBottomTab = 0 },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF246BFD),
                        selectedTextColor = Color(0xFF246BFD),
                        indicatorColor = Color(0xFFE8F0FE)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Call, contentDescription = "Calls") },
                    label = { Text("Calls", fontSize = 11.sp) },
                    selected = selectedBottomTab == 1,
                    onClick = { selectedBottomTab = 1 },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF246BFD),
                        selectedTextColor = Color(0xFF246BFD),
                        indicatorColor = Color(0xFFE8F0FE)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Contacts, contentDescription = "Contacts") },
                    label = { Text("Contacts", fontSize = 11.sp) },
                    selected = selectedBottomTab == 2,
                    onClick = { selectedBottomTab = 2; onAddFriend() },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF246BFD),
                        selectedTextColor = Color(0xFF246BFD),
                        indicatorColor = Color(0xFFE8F0FE)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings", fontSize = 11.sp) },
                    selected = selectedBottomTab == 3,
                    onClick = { selectedBottomTab = 3; onSettings() },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF246BFD),
                        selectedTextColor = Color(0xFF246BFD),
                        indicatorColor = Color(0xFFE8F0FE)
                    )
                )
            }
        }
    ) { paddingValues ->
        // Filter chats based on selected tab
        val filteredChats = when (selectedTab) {
            0 -> uiState.chats.filter { !it.isArchived } // All (non-archived)
            1 -> uiState.chats.filter { it.type == "group" || it.type == "community" }
            2 -> uiState.chats.filter { it.type == "channel" }
            3 -> uiState.chats // Labels tab shows all with label info
            else -> uiState.chats
        }

        // Sort: pinned first, then by time
        val sortedChats = filteredChats.sortedByDescending { it.isPinned }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading && uiState.chats.isEmpty()) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = Color(0xFF246BFD)
                )
            } else if (selectedTab == 3) {
                // Labels tab
                LabelsTabContent(
                    labels = uiState.labels,
                    chats = uiState.chats,
                    chatLabels = uiState.chatLabels,
                    onChatClick = onChatClick,
                    onCreateLabel = { showCreateLabelDialog = true }
                )
            } else if (sortedChats.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = when (selectedTab) {
                            1 -> Icons.Default.Group
                            2 -> Icons.Default.Campaign
                            else -> Icons.Default.Message
                        },
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = when (selectedTab) {
                            1 -> "No groups yet"
                            2 -> "No channels yet"
                            else -> "No chats yet"
                        },
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = when (selectedTab) {
                            1 -> "Create a group to chat with multiple people"
                            2 -> "Create a channel to broadcast messages"
                            else -> "Start a new conversation"
                        },
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                }
            } else {
                // Archived chats banner
                val archivedCount = uiState.chats.count { it.isArchived }

                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    if (archivedCount > 0 && selectedTab == 0) {
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { /* Could navigate to archived chats */ }
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.Archive,
                                    contentDescription = null,
                                    tint = Color(0xFF246BFD),
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(16.dp))
                                Text(
                                    text = "Archived",
                                    fontWeight = FontWeight.Medium,
                                    color = Color(0xFF246BFD)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "$archivedCount",
                                    fontSize = 13.sp,
                                    color = Color.Gray
                                )
                            }
                            Divider()
                        }
                    }

                    items(sortedChats) { chat ->
                        ChatListItemView(
                            chat = chat,
                            labels = uiState.labels,
                            onClick = { onChatClick(chat.id) },
                            onLongClick = { longPressedChat = chat }
                        )
                        Divider(modifier = Modifier.padding(start = 72.dp))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ChatListItemView(
    chat: ChatSummary,
    labels: List<ChatLabel> = emptyList(),
    onClick: () -> Unit,
    onLongClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar
        Box {
            Surface(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape),
                color = when (chat.type) {
                    "group", "community" -> Color(0xFF4CAF50)
                    "channel" -> Color(0xFFFF9800)
                    else -> Color(0xFF246BFD)
                }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (chat.type == "group" || chat.type == "community") {
                        Icon(Icons.Default.Group, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                    } else if (chat.type == "channel") {
                        Icon(Icons.Default.Campaign, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text(
                            text = chat.name.firstOrNull()?.toString() ?: "?",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                    }
                }
            }
            // Muted indicator
            if (chat.isMuted) {
                Surface(
                    modifier = Modifier
                        .size(16.dp)
                        .align(Alignment.BottomEnd),
                    shape = CircleShape,
                    color = Color.White
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.VolumeOff,
                            contentDescription = "Muted",
                            modifier = Modifier.size(12.dp),
                            tint = Color.Gray
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (chat.isPinned) {
                        Icon(
                            Icons.Default.PushPin,
                            contentDescription = "Pinned",
                            modifier = Modifier.size(14.dp),
                            tint = Color(0xFF246BFD)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                    Text(
                        text = chat.name,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Text(
                    text = chat.lastMessageTime,
                    fontSize = 12.sp,
                    color = if (chat.unreadCount > 0) Color(0xFF246BFD) else Color.Gray
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            // Labels row
            if (chat.labels.isNotEmpty()) {
                Row(
                    modifier = Modifier.padding(bottom = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    chat.labels.take(3).forEach { labelId ->
                        val label = labels.find { it.id == labelId }
                        if (label != null) {
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Color(label.color).copy(alpha = 0.15f),
                                modifier = Modifier.height(16.dp)
                            ) {
                                Text(
                                    text = label.name,
                                    fontSize = 9.sp,
                                    color = Color(label.color),
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                            }
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = chat.lastMessage,
                    fontSize = 14.sp,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )

                if (chat.unreadCount > 0) {
                    Surface(
                        shape = CircleShape,
                        color = Color(0xFF246BFD),
                        modifier = Modifier.size(20.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                text = chat.unreadCount.toString(),
                                color = Color.White,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChatOptionsDialog(
    chat: ChatSummary,
    labels: List<ChatLabel>,
    onDismiss: () -> Unit,
    onPin: () -> Unit,
    onMute: () -> Unit,
    onArchive: () -> Unit,
    onDelete: () -> Unit,
    onBlock: () -> Unit,
    onReport: () -> Unit,
    onLabel: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            contentColor = Color(0xFF1A1A2E)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = chat.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color(0xFF1A1A2E),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                // Pin
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPin() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.PushPin, contentDescription = null, tint = Color(0xFF246BFD))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(if (chat.isPinned) "Unpin Chat" else "Pin Chat", color = Color(0xFF1A1A2E))
                }

                // Label
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onLabel() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Label, contentDescription = null, tint = Color(0xFF4CAF50))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Add Label", color = Color(0xFF1A1A2E))
                }

                // Mute
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onMute() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        if (chat.isMuted) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
                        contentDescription = null,
                        tint = Color(0xFF607D8B)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(if (chat.isMuted) "Unmute" else "Mute", color = Color(0xFF1A1A2E))
                }

                // Archive
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onArchive() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Archive, contentDescription = null, tint = Color(0xFF795548))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(if (chat.isArchived) "Unarchive" else "Archive", color = Color(0xFF1A1A2E))
                }

                Divider(modifier = Modifier.padding(vertical = 4.dp))

                // Delete
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onDelete() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Delete, contentDescription = null, tint = Color.Red)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Delete Chat", color = Color.Red)
                }

                // Block
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onBlock() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Block, contentDescription = null, tint = Color.Red)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(if (chat.isBlocked) "Unblock" else "Block", color = Color.Red)
                }

                // Report
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onReport() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Flag, contentDescription = null, tint = Color.Red)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Report", color = Color.Red)
                }
            }
        }
    }
}

@Composable
fun LabelAssignDialog(
    chatId: String,
    labels: List<ChatLabel>,
    assignedLabels: List<String>,
    onDismiss: () -> Unit,
    onToggleLabel: (String) -> Unit,
    onCreateNew: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            contentColor = Color(0xFF1A1A2E)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Assign Labels",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = Color(0xFF1A1A2E),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                labels.forEach { label ->
                    val isAssigned = assignedLabels.contains(label.id)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onToggleLabel(label.id) }
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = isAssigned,
                            onCheckedChange = { onToggleLabel(label.id) },
                            colors = CheckboxDefaults.colors(checkedColor = Color(label.color))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = CircleShape,
                            color = Color(label.color),
                            modifier = Modifier.size(12.dp)
                        ) {}
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(label.name, color = Color(0xFF1A1A2E))
                    }
                }

                Divider(modifier = Modifier.padding(vertical = 8.dp))

                TextButton(
                    onClick = onCreateNew,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFF246BFD))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Create New Label", color = Color(0xFF246BFD))
                }

                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Done", color = Color(0xFF246BFD))
                }
            }
        }
    }
}

@Composable
fun LabelsTabContent(
    labels: List<ChatLabel>,
    chats: List<ChatSummary>,
    chatLabels: Map<String, List<String>>,
    onChatClick: (String) -> Unit,
    onCreateLabel: () -> Unit
) {
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        item {
            TextButton(
                onClick = onCreateLabel,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = Color(0xFF246BFD))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Create New Label", color = Color(0xFF246BFD))
            }
            Divider()
        }

        items(labels) { label ->
            val labelChats = chats.filter { chat ->
                chatLabels[chat.id]?.contains(label.id) == true
            }

            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = CircleShape,
                        color = Color(label.color),
                        modifier = Modifier.size(16.dp)
                    ) {}
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = label.name,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${labelChats.size} chats",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }

                if (labelChats.isNotEmpty()) {
                    labelChats.forEach { chat ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onChatClick(chat.id) }
                                .padding(start = 44.dp, end = 16.dp, top = 6.dp, bottom = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape),
                                color = Color(0xFF246BFD)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = chat.name.firstOrNull()?.toString() ?: "?",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(chat.name, fontSize = 14.sp)
                        }
                    }
                } else {
                    Text(
                        text = "No chats with this label",
                        fontSize = 13.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(start = 44.dp, bottom = 4.dp)
                    )
                }

                Divider(modifier = Modifier.padding(start = 44.dp))
            }
        }
    }
}
