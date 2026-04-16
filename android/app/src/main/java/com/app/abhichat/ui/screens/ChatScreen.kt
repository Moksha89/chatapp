package com.app.abhichat.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.app.abhichat.data.api.ApiClient
import com.app.abhichat.data.model.Message
import com.app.abhichat.data.model.User
import com.app.abhichat.service.SocketManager
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    chatId: String,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var messages by remember { mutableStateOf<List<Message>>(emptyList()) }
    var messageText by remember { mutableStateOf("") }
    var otherUser by remember { mutableStateOf<User?>(null) }
    var currentUserId by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    val listState = rememberLazyListState()

    fun loadMessages() {
        scope.launch {
            try {
                val fetched = ApiClient.getService().getMessages(chatId)
                messages = fetched.reversed() // Show oldest first
            } catch (e: Exception) {
                android.util.Log.e("Chat", "Failed to load messages", e)
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(chatId) {
        // Get current user
        try {
            val me = ApiClient.getService().getMe()
            currentUserId = me.id
        } catch (_: Exception) {}

        // Get chat info from chat list
        try {
            val chats = ApiClient.getService().getChats()
            otherUser = chats.find { it.id == chatId }?.otherUser
        } catch (_: Exception) {}

        loadMessages()

        // Mark as read
        try { ApiClient.getService().markAsRead(chatId) } catch (_: Exception) {}

        // Listen for new messages
        SocketManager.on("message:new") { args ->
            if (args.isNotEmpty()) {
                try {
                    val data = args[0] as JSONObject
                    val msgChatId = data.optString("chatId")
                    if (msgChatId == chatId) {
                        loadMessages()
                        scope.launch {
                            try { ApiClient.getService().markAsRead(chatId) } catch (_: Exception) {}
                        }
                    }
                } catch (_: Exception) {
                    loadMessages()
                }
            }
        }
    }

    DisposableEffect(chatId) {
        onDispose {
            SocketManager.off("message:new")
        }
    }

    // Auto-scroll to bottom when new messages arrive
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            modifier = Modifier.size(36.dp),
                            shape = CircleShape,
                            color = Color(0xFFD1E4FF)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                otherUser?.displayName ?: otherUser?.phone ?: "Chat",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp,
                                color = Color.White
                            )
                            Text(
                                if (otherUser?.isOnline == true) "online" else "offline",
                                fontSize = 12.sp,
                                color = if (otherUser?.isOnline == true) Color(0xFF81C784) else Color(0xFFB0BEC5)
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                ),
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        // Start audio call
                        otherUser?.let { user ->
                            val data = JSONObject().apply {
                                put("targetUserId", user.id)
                                put("callType", "audio")
                                put("peerId", "android-$currentUserId-${System.currentTimeMillis()}")
                            }
                            SocketManager.emit("call:initiate", data)
                        }
                    }) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "Audio Call",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = {
                        // Start video call
                        otherUser?.let { user ->
                            val data = JSONObject().apply {
                                put("targetUserId", user.id)
                                put("callType", "video")
                                put("peerId", "android-$currentUserId-${System.currentTimeMillis()}")
                            }
                            SocketManager.emit("call:initiate", data)
                        }
                    }) {
                        Icon(
                            Icons.Default.Videocam,
                            contentDescription = "Video Call",
                            tint = Color.White
                        )
                    }
                }
            )
        },
        bottomBar = {
            // Message input
            Surface(
                shadowElevation = 8.dp,
                color = Color.White
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                        .navigationBarsPadding(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        placeholder = { Text("Type a message...", fontSize = 14.sp) },
                        shape = RoundedCornerShape(24.dp),
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedBorderColor = Color(0xFFE0E0E0),
                            focusedBorderColor = MaterialTheme.colorScheme.primary
                        ),
                        maxLines = 4
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    FloatingActionButton(
                        onClick = {
                            val text = messageText.trim()
                            if (text.isEmpty()) return@FloatingActionButton

                            val data = JSONObject().apply {
                                put("chatId", chatId)
                                put("content", text)
                                put("type", "text")
                            }
                            SocketManager.emit("message:send", data)
                            messageText = ""

                            // Optimistically add message
                            val optimistic = Message(
                                id = UUID.randomUUID().toString(),
                                chatId = chatId,
                                senderId = currentUserId,
                                content = text,
                                type = "text",
                                createdAt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                            )
                            messages = messages + optimistic
                        },
                        modifier = Modifier.size(48.dp),
                        containerColor = MaterialTheme.colorScheme.primary,
                        shape = CircleShape
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Send",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFECE5DD))
        ) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(messages) { message ->
                        MessageBubble(
                            message = message,
                            isMe = message.senderId == currentUserId
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(message: Message, isMe: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isMe) 16.dp else 4.dp,
                bottomEnd = if (isMe) 4.dp else 16.dp
            ),
            color = if (isMe) Color(0xFF1565C0) else Color.White,
            shadowElevation = 1.dp,
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) {
                Text(
                    text = message.content,
                    color = if (isMe) Color.White else Color(0xFF1A1C1E),
                    fontSize = 15.sp
                )

                Text(
                    text = formatMessageTime(message.createdAt),
                    color = if (isMe) Color(0xFFB0BEC5) else Color.Gray,
                    fontSize = 11.sp,
                    modifier = Modifier
                        .align(Alignment.End)
                        .padding(top = 2.dp)
                )
            }
        }
    }
}

private fun formatMessageTime(dateStr: String): String {
    return try {
        val formats = listOf(
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US),
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        )
        formats.forEach { it.timeZone = TimeZone.getTimeZone("UTC") }

        var date: Date? = null
        for (fmt in formats) {
            try { date = fmt.parse(dateStr); break } catch (_: Exception) {}
        }
        if (date == null) return ""

        SimpleDateFormat("h:mm a", Locale.getDefault()).format(date)
    } catch (_: Exception) {
        ""
    }
}
