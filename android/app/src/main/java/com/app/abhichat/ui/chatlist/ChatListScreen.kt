package com.app.abhichat.ui.chatlist

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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.app.abhichat.data.api.ApiService
import com.app.abhichat.data.model.*
import com.app.abhichat.data.socket.SocketManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject

@HiltViewModel
class ChatListViewModel @Inject constructor(
    private val apiService: ApiService,
    private val prefs: android.content.SharedPreferences
) : ViewModel() {

    private val _chats = MutableStateFlow<List<Chat>>(emptyList())
    val chats = _chats.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading = _loading.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    private val _showNewChat = MutableStateFlow(false)
    val showNewChat = _showNewChat.asStateFlow()

    private val _searchResults = MutableStateFlow<List<User>>(emptyList())
    val searchResults = _searchResults.asStateFlow()

    init {
        loadChats()
        setupSocketListeners()
    }

    fun loadChats() {
        viewModelScope.launch {
            _loading.value = true
            try {
                val result = apiService.getChats()
                _chats.value = result
            } catch (e: Exception) {
                // silently fail
            } finally {
                _loading.value = false
            }
        }
    }

    private fun setupSocketListeners() {
        SocketManager.on("message:new") { args ->
            loadChats() // Refresh chat list on new message
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun toggleNewChat() {
        _showNewChat.value = !_showNewChat.value
        if (_showNewChat.value) {
            _searchResults.value = emptyList()
        }
    }

    fun searchUsers(query: String) {
        viewModelScope.launch {
            try {
                val results = apiService.searchUsers(query)
                _searchResults.value = results
            } catch (e: Exception) {
                _searchResults.value = emptyList()
            }
        }
    }

    fun createChat(otherUserId: String, onChatCreated: (String, String, String) -> Unit) {
        viewModelScope.launch {
            try {
                val chat = apiService.createDirectChat(CreateDirectChatRequest(otherUserId))
                val currentUserId = prefs.getString("user_id", "") ?: ""
                val otherParticipant = chat.participants?.find { it.id != currentUserId }
                val title = otherParticipant?.displayName ?: otherParticipant?.phone ?: "Chat"
                val otherUid = otherParticipant?.id ?: otherUserId
                _showNewChat.value = false
                loadChats()
                onChatCreated(chat.id, title, otherUid)
            } catch (e: Exception) {
                // silently fail
            }
        }
    }

    fun getChatTitle(chat: Chat): String {
        val currentUserId = prefs.getString("user_id", "") ?: ""
        val other = chat.participants?.find { it.id != currentUserId }
        return other?.displayName ?: other?.phone ?: chat.title ?: "Chat"
    }

    fun getOtherUserId(chat: Chat): String {
        val currentUserId = prefs.getString("user_id", "") ?: ""
        return chat.participants?.find { it.id != currentUserId }?.id ?: ""
    }

    override fun onCleared() {
        super.onCleared()
        SocketManager.off("message:new")
    }
}

@Composable
fun ChatListScreen(
    onChatSelected: (String, String, String) -> Unit,
    onSettingsClick: () -> Unit,
    viewModel: ChatListViewModel = hiltViewModel()
) {
    val chats by viewModel.chats.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val showNewChat by viewModel.showNewChat.collectAsState()
    val searchResults by viewModel.searchResults.collectAsState()

    var userSearchQuery by remember { mutableStateOf("") }

    val filteredChats = chats.filter {
        val title = viewModel.getChatTitle(it)
        title.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.primary,
                shadowElevation = 4.dp
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Abhi Chat",
                            color = Color.White,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = onSettingsClick) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings", tint = Color.White)
                        }
                    }

                    // Search bar
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        placeholder = { Text("Search chats...", color = Color.White.copy(alpha = 0.7f)) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White,
                            cursorColor = Color.White,
                            focusedBorderColor = Color.White.copy(alpha = 0.5f),
                            unfocusedBorderColor = Color.White.copy(alpha = 0.3f)
                        ),
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.White.copy(alpha = 0.7f)) },
                        singleLine = true
                    )
                }
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.toggleNewChat() },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Chat, contentDescription = "New Chat", tint = Color.White)
            }
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (loading && chats.isEmpty()) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (filteredChats.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center).padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.Chat,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        if (searchQuery.isNotEmpty()) "No matching chats" else "No chats yet",
                        fontWeight = FontWeight.Medium,
                        color = Color.Gray
                    )
                    Text(
                        if (searchQuery.isNotEmpty()) "Try a different search term" else "Tap + to start a conversation",
                        color = Color.Gray,
                        fontSize = 13.sp
                    )
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(filteredChats) { chat ->
                        ChatListItem(
                            chat = chat,
                            title = viewModel.getChatTitle(chat),
                            onClick = {
                                onChatSelected(
                                    chat.id,
                                    viewModel.getChatTitle(chat),
                                    viewModel.getOtherUserId(chat)
                                )
                            }
                        )
                    }
                }
            }

            // New Chat Dialog
            if (showNewChat) {
                AlertDialog(
                    onDismissRequest = { viewModel.toggleNewChat() },
                    title = { Text("New Chat") },
                    text = {
                        Column {
                            OutlinedTextField(
                                value = userSearchQuery,
                                onValueChange = {
                                    userSearchQuery = it
                                    if (it.length >= 2) viewModel.searchUsers(it)
                                },
                                placeholder = { Text("Search by name or phone") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true
                            )
                            Spacer(modifier = Modifier.height(12.dp))

                            if (searchResults.isEmpty() && userSearchQuery.length >= 2) {
                                Text("No users found", color = Color.Gray, fontSize = 13.sp)
                            }

                            searchResults.forEach { user ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            viewModel.createChat(user.id, onChatSelected)
                                        }
                                        .padding(vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.primary),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            (user.displayName ?: user.phone).take(1).uppercase(),
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            user.displayName ?: user.phone,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(user.phone, fontSize = 13.sp, color = Color.Gray)
                                    }
                                }
                            }
                        }
                    },
                    confirmButton = {},
                    dismissButton = {
                        TextButton(onClick = { viewModel.toggleNewChat() }) {
                            Text("Cancel")
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun ChatListItem(chat: Chat, title: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center
        ) {
            Text(
                title.take(1).uppercase(),
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                chat.lastMessage?.content ?: "No messages yet",
                color = Color.Gray,
                fontSize = 13.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }

        if ((chat.unreadCount ?: 0) > 0) {
            Box(
                modifier = Modifier
                    .size(22.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "${chat.unreadCount}",
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
    Divider(modifier = Modifier.padding(start = 82.dp), color = Color(0xFFF0F0F0))
}
