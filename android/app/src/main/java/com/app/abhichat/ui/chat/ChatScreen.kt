package com.app.abhichat.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val apiService: ApiService,
    private val prefs: android.content.SharedPreferences
) : ViewModel() {

    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages = _messages.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading = _loading.asStateFlow()

    private val _isTyping = MutableStateFlow(false)
    val isTyping = _isTyping.asStateFlow()

    private val _isOnline = MutableStateFlow(false)
    val isOnline = _isOnline.asStateFlow()

    private var currentChatId = ""
    private var otherUserId = ""
    private val seenMessageIds = mutableSetOf<String>()

    fun loadMessages(chatId: String, otherUser: String = "") {
        currentChatId = chatId
        otherUserId = otherUser
        viewModelScope.launch {
            _loading.value = true
            try {
                val result = apiService.getMessages(chatId)
                val sorted = result.sortedBy { it.createdAt }
                _messages.value = sorted
                seenMessageIds.addAll(sorted.map { it.id })
                // Mark messages as read
                try { apiService.markRead(chatId) } catch (_: Exception) {}
            } catch (e: Exception) {
                // silently fail
            } finally {
                _loading.value = false
            }
        }
        setupSocketListeners(chatId)
    }

    private fun setupSocketListeners(chatId: String) {
        // Listen for incoming messages from other users
        SocketManager.on("message:new") { args ->
            if (args.isNotEmpty()) {
                try {
                    val raw = args[0] as JSONObject
                    // Backend wraps message in { message: {...} }
                    val data = if (raw.has("message")) raw.getJSONObject("message") else raw
                    val msgChatId = data.optString("chatId")
                    if (msgChatId == chatId) {
                        val msgId = data.optString("id")
                        if (!seenMessageIds.contains(msgId)) {
                            seenMessageIds.add(msgId)
                            // Backend uses "text" field; fall back to "content" for compat
                            val msgText = data.optString("text", data.optString("content", ""))
                            val msg = Message(
                                id = msgId,
                                chatId = msgChatId,
                                senderId = data.optString("senderId"),
                                content = msgText,
                                text = msgText,
                                type = data.optString("type", "TEXT"),
                                status = data.optString("status", "SENT"),
                                createdAt = data.optString("createdAt", "")
                            )
                            _messages.value = (_messages.value + msg).sortedBy { it.createdAt }
                            // Mark as read
                            viewModelScope.launch {
                                try { apiService.markRead(chatId) } catch (_: Exception) {}
                            }
                        }
                    }
                } catch (_: Exception) {}
            }
        }

        // Listen for message:sent confirmation from backend (updates optimistic message)
        SocketManager.on("message:sent") { args ->
            if (args.isNotEmpty()) {
                try {
                    val raw = args[0] as JSONObject
                    val tempId = raw.optString("tempId", "")
                    val msgObj = if (raw.has("message")) raw.getJSONObject("message") else null
                    if (tempId.isNotEmpty() && msgObj != null) {
                        val realId = msgObj.optString("id", tempId)
                        seenMessageIds.add(realId)
                        _messages.value = _messages.value.map {
                            if (it.id == tempId) it.copy(id = realId, status = "SENT") else it
                        }
                    }
                } catch (_: Exception) {}
            }
        }

        // Listen for message:delivered status update
        SocketManager.on("message:delivered") { args ->
            if (args.isNotEmpty()) {
                try {
                    val raw = args[0] as JSONObject
                    val messageId = raw.optString("messageId", "")
                    if (messageId.isNotEmpty()) {
                        _messages.value = _messages.value.map {
                            if (it.id == messageId) it.copy(status = "DELIVERED") else it
                        }
                    }
                } catch (_: Exception) {}
            }
        }

        // Listen for message:read status update
        SocketManager.on("message:read") { args ->
            if (args.isNotEmpty()) {
                try {
                    val raw = args[0] as JSONObject
                    val messageId = raw.optString("messageId", "")
                    if (messageId.isNotEmpty()) {
                        _messages.value = _messages.value.map {
                            if (it.id == messageId) it.copy(status = "READ") else it
                        }
                    }
                } catch (_: Exception) {}
            }
        }

        SocketManager.on("typing:start") { args ->
            if (args.isNotEmpty()) {
                try {
                    val data = args[0] as JSONObject
                    if (data.optString("chatId") == chatId) {
                        _isTyping.value = true
                    }
                } catch (_: Exception) {}
            }
        }

        SocketManager.on("typing:stop") { args ->
            if (args.isNotEmpty()) {
                try {
                    val data = args[0] as JSONObject
                    if (data.optString("chatId") == chatId) {
                        _isTyping.value = false
                    }
                } catch (_: Exception) {}
            }
        }

        // Fix #4: Filter online/offline by the other user's ID
        SocketManager.on("user:online") { args ->
            if (args.isNotEmpty()) {
                try {
                    val data = args[0] as JSONObject
                    val onlineUserId = data.optString("userId")
                    if (onlineUserId == otherUserId) {
                        _isOnline.value = true
                    }
                } catch (_: Exception) {}
            }
        }

        SocketManager.on("user:offline") { args ->
            if (args.isNotEmpty()) {
                try {
                    val data = args[0] as JSONObject
                    val offlineUserId = data.optString("userId")
                    if (offlineUserId == otherUserId) {
                        _isOnline.value = false
                    }
                } catch (_: Exception) {}
            }
        }
    }

    fun sendMessage(chatId: String, content: String) {
        val currentUserId = prefs.getString("user_id", "") ?: ""
        val tempId = UUID.randomUUID().toString()
        val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

        // Optimistic update
        val optimistic = Message(
            id = tempId,
            chatId = chatId,
            senderId = currentUserId,
            content = content,
            type = "TEXT",
            status = "SENDING",
            createdAt = now
        )
        seenMessageIds.add(tempId)
        _messages.value = (_messages.value + optimistic).sortedBy { it.createdAt }

        // Send via socket — include tempId so backend can echo it back
        val payload = JSONObject().apply {
            put("chatId", chatId)
            put("text", content)
            put("type", "TEXT")
            put("tempId", tempId)
        }
        SocketManager.emit("message:send", payload) { response ->
            // NestJS @SubscribeMessage return value comes as ack callback args
            if (response.isNotEmpty()) {
                try {
                    val data = response[0] as JSONObject
                    val realId = data.optString("id", tempId)
                    val error = data.optString("error", "")
                    if (error.isEmpty()) {
                        seenMessageIds.add(realId)
                        _messages.value = _messages.value.map {
                            if (it.id == tempId) it.copy(id = realId, status = "SENT") else it
                        }
                    }
                } catch (_: Exception) {
                    // Ack failed — rely on message:sent event listener as fallback
                }
            }
        }
    }

    fun sendTyping(chatId: String, isTyping: Boolean) {
        val event = if (isTyping) "typing:start" else "typing:stop"
        val payload = JSONObject().apply { put("chatId", chatId) }
        SocketManager.emit(event, payload)
    }

    override fun onCleared() {
        super.onCleared()
        SocketManager.off("message:new")
        SocketManager.off("message:sent")
        SocketManager.off("message:delivered")
        SocketManager.off("message:read")
        SocketManager.off("typing:start")
        SocketManager.off("typing:stop")
        SocketManager.off("user:online")
        SocketManager.off("user:offline")
    }
}

@Composable
fun ChatScreen(
    chatId: String,
    chatTitle: String,
    otherUserId: String,
    currentUserId: String,
    onBack: () -> Unit,
    onStartCall: (String) -> Unit,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val messages by viewModel.messages.collectAsState()
    val loading by viewModel.loading.collectAsState()
    val isTyping by viewModel.isTyping.collectAsState()
    val isOnline by viewModel.isOnline.collectAsState()

    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(chatId) {
        viewModel.loadMessages(chatId, otherUserId)
    }

    // Auto-scroll to bottom on new messages
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.primary,
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 4.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }

                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            chatTitle.take(1).uppercase(),
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            chatTitle,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            when {
                                isTyping -> "typing..."
                                isOnline -> "online"
                                else -> "last seen recently"
                            },
                            color = Color.White.copy(alpha = 0.8f),
                            fontSize = 12.sp
                        )
                    }

                    IconButton(onClick = { onStartCall("AUDIO") }) {
                        Icon(Icons.Default.Call, contentDescription = "Voice Call", tint = Color.White)
                    }
                    IconButton(onClick = { onStartCall("VIDEO") }) {
                        Icon(Icons.Default.Videocam, contentDescription = "Video Call", tint = Color.White)
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF0F2F5))
        ) {
            // Messages
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                state = listState,
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                if (loading) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        }
                    }
                }

                items(messages) { message ->
                    val isMine = message.senderId == currentUserId
                    MessageBubble(message = message, isMine = isMine)
                }

                if (isTyping) {
                    item {
                        Text(
                            "typing...",
                            modifier = Modifier.padding(start = 16.dp, top = 4.dp),
                            color = Color.Gray,
                            fontSize = 13.sp
                        )
                    }
                }
            }

            // Input bar
            Surface(
                color = Color.White,
                shadowElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp, vertical = 8.dp)
                        .navigationBarsPadding(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = {
                            inputText = it
                            viewModel.sendTyping(chatId, it.isNotEmpty())
                        },
                        placeholder = { Text("Type a message...") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = Color(0xFFE0E0E0),
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black,
                            cursorColor = MaterialTheme.colorScheme.primary
                        ),
                        maxLines = 4,
                        singleLine = false
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    FloatingActionButton(
                        onClick = {
                            if (inputText.isNotBlank()) {
                                viewModel.sendMessage(chatId, inputText.trim())
                                viewModel.sendTyping(chatId, false)
                                inputText = ""
                            }
                        },
                        modifier = Modifier.size(48.dp),
                        containerColor = MaterialTheme.colorScheme.primary,
                        shape = CircleShape
                    ) {
                        Icon(Icons.Default.Send, contentDescription = "Send", tint = Color.White, modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun MessageBubble(message: Message, isMine: Boolean) {
    val bgColor = if (isMine) MaterialTheme.colorScheme.primary else Color.White
    val textColor = if (isMine) Color.White else Color.Black
    val alignment = if (isMine) Arrangement.End else Arrangement.Start

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = alignment
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isMine) 16.dp else 4.dp,
                bottomEnd = if (isMine) 4.dp else 16.dp
            ),
            color = bgColor,
            shadowElevation = 1.dp,
            modifier = Modifier.widthIn(max = 280.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                Text(
                    message.text ?: message.content ?: "",
                    color = textColor,
                    fontSize = 15.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    modifier = Modifier.align(Alignment.End),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val timeStr = try {
                        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                        sdf.timeZone = TimeZone.getTimeZone("UTC")
                        val date = sdf.parse(message.createdAt?.take(19) ?: "")
                        val outFmt = SimpleDateFormat("h:mm a", Locale.US)
                        outFmt.timeZone = TimeZone.getDefault()
                        if (date != null) outFmt.format(date) else ""
                    } catch (_: Exception) { "" }

                    Text(
                        timeStr,
                        color = if (isMine) Color.White.copy(alpha = 0.7f) else Color.Gray,
                        fontSize = 10.sp
                    )
                    if (isMine) {
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            when (message.status) {
                                "SENDING" -> Icons.Default.Schedule
                                "SENT" -> Icons.Default.Check
                                "DELIVERED" -> Icons.Default.DoneAll
                                "READ" -> Icons.Default.DoneAll
                                else -> Icons.Default.Check
                            },
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = if (message.status == "READ") Color(0xFF90CAF9) else Color.White.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }
    }
}
