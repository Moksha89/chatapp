package com.chatapp.presentation.chat

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.provider.MediaStore
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import com.chatapp.domain.model.Message
import com.chatapp.domain.model.MessageStatus
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.roundToInt

val QUICK_REACTIONS = listOf("👍", "❤️", "😂", "😮", "😢", "🙏")

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(
    chatId: String,
    onBack: () -> Unit,
    onCall: (String) -> Unit = {},
    onVideoCall: (String) -> Unit = {},
    onProfileClick: (String) -> Unit = {},
    currentUserId: String = "current-user",
    chatName: String = "Chat",
    isOnline: Boolean = false,
    isTyping: Boolean = false,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Use resolved name from API if available, otherwise fall back to navigation param
    val effectiveChatName = uiState.resolvedChatName ?: chatName

    // Use ViewModel's real-time online/typing status
    val effectiveOnline = uiState.isOnline || isOnline
    val effectiveTyping = uiState.isTyping || isTyping
    
    var messageText by remember { mutableStateOf("") }
    var selectedMessage by remember { mutableStateOf<Message?>(null) }
    var showReactionPicker by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var editingContent by remember { mutableStateOf("") }
    var replyToMessage by remember { mutableStateOf<Message?>(null) }
    var showEmojiPicker by remember { mutableStateOf(false) }
    var showAttachMenu by remember { mutableStateOf(false) }

    // Activity result launchers for attachments with real file upload
    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            Toast.makeText(context, "Uploading image...", Toast.LENGTH_SHORT).show()
            viewModel.sendMediaMessage(context, it, "image")
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        bitmap?.let {
            // Save bitmap to temp file and upload
            try {
                val tempFile = java.io.File(context.cacheDir, "camera_${System.currentTimeMillis()}.jpg")
                val outputStream = java.io.FileOutputStream(tempFile)
                it.compress(android.graphics.Bitmap.CompressFormat.JPEG, 90, outputStream)
                outputStream.flush()
                outputStream.close()
                val uri = Uri.fromFile(tempFile)
                Toast.makeText(context, "Uploading photo...", Toast.LENGTH_SHORT).show()
                viewModel.sendMediaMessage(context, uri, "image")
            } catch (e: Exception) {
                Toast.makeText(context, "Failed to capture photo", Toast.LENGTH_SHORT).show()
            }
        }
    }

    val documentLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let {
            Toast.makeText(context, "Uploading document...", Toast.LENGTH_SHORT).show()
            viewModel.sendMediaMessage(context, it, "file")
        }
    }

    // Load messages when screen opens
    LaunchedEffect(chatId) {
        viewModel.loadMessages(chatId, currentUserId)
    }

    // Play notification sound when new messages arrive from others
    val previousMessageCount = remember { mutableIntStateOf(uiState.messages.size) }
    LaunchedEffect(uiState.messages.size) {
        if (uiState.messages.size > previousMessageCount.intValue && previousMessageCount.intValue > 0) {
            val lastMessage = uiState.messages.lastOrNull()
            if (lastMessage != null && lastMessage.senderId != currentUserId) {
                try {
                    val notificationUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    val ringtone = RingtoneManager.getRingtone(context, notificationUri)
                    ringtone?.play()
                } catch (_: Exception) {}
            }
        }
        previousMessageCount.intValue = uiState.messages.size
    }

    // Show error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(error)
            viewModel.clearError()
        }
    }

    // Message Menu Dialog
    if (showReactionPicker && selectedMessage != null) {
        MessageMenuDialog(
            message = selectedMessage!!,
            currentUserId = uiState.currentUserId,
            onDismiss = { 
                showReactionPicker = false 
                selectedMessage = null
            },
            onReaction = { emoji ->
                viewModel.toggleReaction(selectedMessage!!.id, emoji)
                showReactionPicker = false
                selectedMessage = null
            },
            onEdit = {
                editingContent = selectedMessage!!.content ?: ""
                showEditDialog = true
                showReactionPicker = false
            },
            onDelete = {
                showDeleteDialog = true
                showReactionPicker = false
            },
            onReply = {
                replyToMessage = selectedMessage
                showReactionPicker = false
                selectedMessage = null
            }
        )
    }

    // Edit Dialog
    if (showEditDialog && selectedMessage != null) {
        EditMessageDialog(
            content = editingContent,
            onContentChange = { editingContent = it },
            onDismiss = { 
                showEditDialog = false
                selectedMessage = null
            },
            onSave = {
                viewModel.editMessage(selectedMessage!!.id, editingContent)
                showEditDialog = false
                selectedMessage = null
            }
        )
    }

    // Delete Dialog
    if (showDeleteDialog && selectedMessage != null) {
        DeleteMessageDialog(
            isOwn = selectedMessage!!.senderId == uiState.currentUserId,
            onDismiss = { 
                showDeleteDialog = false
                selectedMessage = null
            },
            onDeleteForMe = {
                viewModel.deleteMessage(selectedMessage!!.id, deleteForEveryone = false)
                showDeleteDialog = false
                selectedMessage = null
            },
            onDeleteForEveryone = {
                viewModel.deleteMessage(selectedMessage!!.id, deleteForEveryone = true)
                showDeleteDialog = false
                selectedMessage = null
            }
        )
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clickable { onProfileClick(chatId) }
                    ) {
                        Box {
                            Surface(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape),
                                color = Color(0xFF246BFD)
                            ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            text = effectiveChatName.firstOrNull()?.toString() ?: "?",
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp
                                        )
                                    }
                                }
                            if (effectiveOnline) {
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .background(Color(0xFF4CAF50), CircleShape)
                                        .align(Alignment.BottomEnd)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                effectiveChatName,
                                fontSize = 15.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = when {
                                    effectiveTyping -> "typing..."
                                    effectiveOnline -> "online"
                                    else -> "offline"
                                },
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A56DB),
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White
                ),
                actions = {
                    IconButton(onClick = { onVideoCall(chatId) }) {
                        Icon(
                            Icons.Default.Videocam,
                            contentDescription = "Video Call",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = { onCall(chatId) }) {
                        Icon(
                            Icons.Default.Call,
                            contentDescription = "Voice Call",
                            tint = Color.White
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF7F8FC))
        ) {
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF246BFD))
                }
            } else {
                val listState = rememberLazyListState()
                
                // Auto-scroll to bottom when new messages arrive
                LaunchedEffect(uiState.messages.size) {
                    if (uiState.messages.isNotEmpty()) {
                        listState.animateScrollToItem(uiState.messages.size - 1)
                    }
                }
                
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp),
                    reverseLayout = false
                ) {
                    items(uiState.messages, key = { it.id }) { message ->
                        SwipeableMessageBubble(
                            message = message,
                            currentUserId = uiState.currentUserId,
                            onLongPress = {
                                if (!message.isDeleted) {
                                    selectedMessage = message
                                    showReactionPicker = true
                                }
                            },
                            onReactionClick = { emoji ->
                                viewModel.toggleReaction(message.id, emoji)
                            },
                            onSwipeToReply = {
                                if (!message.isDeleted) {
                                    replyToMessage = message
                                }
                            }
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }
            }

            // Reply preview
            if (replyToMessage != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFE8E8E8)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .width(4.dp)
                                .height(40.dp)
                                .background(Color(0xFF246BFD))
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Reply to",
                                fontSize = 12.sp,
                                color = Color(0xFF246BFD),
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = replyToMessage?.content?.take(50) ?: "",
                                fontSize = 14.sp,
                                color = Color.Gray,
                                maxLines = 1
                            )
                        }
                        IconButton(onClick = { replyToMessage = null }) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Cancel reply",
                                tint = Color.Gray
                            )
                        }
                    }
                }
            }

            // Attachment menu
            if (showAttachMenu) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFFF5F5F5)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        AttachmentOption(Icons.Default.Image, "Gallery", Color(0xFF4CAF50)) {
                            showAttachMenu = false
                            galleryLauncher.launch("image/*")
                        }
                        AttachmentOption(Icons.Default.CameraAlt, "Camera", Color(0xFF2196F3)) {
                            showAttachMenu = false
                            cameraLauncher.launch(null)
                        }
                        AttachmentOption(Icons.Default.InsertDriveFile, "Document", Color(0xFF9C27B0)) {
                            showAttachMenu = false
                            documentLauncher.launch(arrayOf("*/*"))
                        }
                        AttachmentOption(Icons.Default.LocationOn, "Location", Color(0xFFFF5722)) {
                            showAttachMenu = false
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q="))
                            try { context.startActivity(intent) } catch (_: Exception) {
                                Toast.makeText(context, "No map app found", Toast.LENGTH_SHORT).show()
                            }
                        }
                        AttachmentOption(Icons.Default.Person, "Contact", Color(0xFF607D8B)) {
                            showAttachMenu = false
                            val intent = Intent(Intent.ACTION_PICK, android.provider.ContactsContract.Contacts.CONTENT_URI)
                            try { context.startActivity(intent) } catch (_: Exception) {
                                Toast.makeText(context, "Cannot open contacts", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                }
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFFF7F8FC)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { showEmojiPicker = !showEmojiPicker; showAttachMenu = false }) {
                        Icon(
                            if (showEmojiPicker) Icons.Default.Keyboard else Icons.Default.EmojiEmotions,
                            contentDescription = "Emoji",
                            tint = Color.Gray
                        )
                    }

                    TextField(
                        value = messageText,
                        onValueChange = { newText ->
                            messageText = newText
                            if (newText.isNotEmpty()) viewModel.sendTypingStart()
                            else viewModel.sendTypingStop()
                        },
                        placeholder = { Text("Type a message") },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(24.dp)),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black,
                            cursorColor = Color(0xFF246BFD),
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        )
                    )

                    IconButton(onClick = { showAttachMenu = !showAttachMenu; showEmojiPicker = false }) {
                        Icon(Icons.Default.AttachFile, contentDescription = "Attach", tint = Color.Gray)
                    }

                    FloatingActionButton(
                        onClick = { 
                            if (messageText.isNotBlank()) {
                                viewModel.sendMessage(messageText, replyToMessage?.id)
                                messageText = ""
                                replyToMessage = null
                                showEmojiPicker = false
                            }
                        },
                        containerColor = Color(0xFF246BFD),
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            Icons.Default.Send,
                            contentDescription = "Send",
                            tint = Color.White
                        )
                    }
                }
            }

            // Emoji picker
            if (showEmojiPicker) {
                EmojiPickerView(
                    onEmojiSelected = { emoji -> messageText += emoji },
                    onDismiss = { showEmojiPicker = false }
                )
            }
        }
    }
}

@Composable
fun AttachmentOption(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    color: Color,
    onClick: () -> Unit
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(
            onClick = onClick,
            modifier = Modifier
                .size(48.dp)
                .background(color, CircleShape)
        ) {
            Icon(icon, contentDescription = label, tint = Color.White)
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(label, fontSize = 11.sp, color = Color.Gray)
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun SwipeableMessageBubble(
    message: Message,
    currentUserId: String,
    onLongPress: () -> Unit,
    onReactionClick: (String) -> Unit,
    onSwipeToReply: () -> Unit
) {
    val isOwn = message.senderId == currentUserId
    var offsetX by remember { mutableFloatStateOf(0f) }
    val swipeThreshold = 100f
    var hasTriggeredReply by remember { mutableStateOf(false) }
    
    val animatedOffsetX by animateFloatAsState(
        targetValue = offsetX,
        animationSpec = tween(durationMillis = if (offsetX == 0f) 200 else 0),
        label = "swipeOffset"
    )

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .pointerInput(Unit) {
                detectHorizontalDragGestures(
                    onDragEnd = {
                        if (offsetX > swipeThreshold && !hasTriggeredReply) {
                            onSwipeToReply()
                            hasTriggeredReply = true
                        }
                        offsetX = 0f
                        hasTriggeredReply = false
                    },
                    onDragCancel = {
                        offsetX = 0f
                        hasTriggeredReply = false
                    },
                    onHorizontalDrag = { _, dragAmount ->
                        // Only allow right swipe (positive direction)
                        val newOffset = offsetX + dragAmount
                        offsetX = newOffset.coerceIn(0f, swipeThreshold * 1.5f)
                    }
                )
            }
    ) {
        // Reply icon that appears when swiping
        if (animatedOffsetX > 20f) {
            Box(
                modifier = Modifier
                    .align(if (isOwn) Alignment.CenterEnd else Alignment.CenterStart)
                    .padding(start = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Reply,
                    contentDescription = "Reply",
                    tint = Color(0xFF246BFD).copy(alpha = (animatedOffsetX / swipeThreshold).coerceIn(0f, 1f)),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
        
        // Message bubble with offset
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .offset { IntOffset(animatedOffsetX.roundToInt(), 0) }
        ) {
            MessageBubble(
                message = message,
                currentUserId = currentUserId,
                onLongPress = onLongPress,
                onReactionClick = onReactionClick
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MessageBubble(
    message: Message,
    currentUserId: String,
    onLongPress: () -> Unit,
    onReactionClick: (String) -> Unit
) {
    val isOwn = message.senderId == currentUserId
    val timeFormat = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    val timeString = timeFormat.format(Date(message.createdAt))
    
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (isOwn) Arrangement.End else Arrangement.Start
        ) {
            Surface(
                shape = RoundedCornerShape(
                    topStart = 12.dp,
                    topEnd = 12.dp,
                    bottomStart = if (isOwn) 12.dp else 0.dp,
                    bottomEnd = if (isOwn) 0.dp else 12.dp
                ),
                color = if (message.isDeleted) Color.LightGray.copy(alpha = 0.5f)
                        else if (isOwn) Color(0xFF246BFD) else Color.White,
                modifier = Modifier
                    .widthIn(max = 280.dp)
                    .combinedClickable(
                        onClick = { onLongPress() },
                        onLongClick = onLongPress
                    )
            ) {
                Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                    if (message.isDeleted) {
                        Text(
                            text = "This message was deleted",
                            fontStyle = FontStyle.Italic,
                            color = if (isOwn) Color.White.copy(alpha = 0.7f) else Color.Gray
                        )
                    } else {
                        Text(
                            text = message.content ?: "",
                            color = if (isOwn) Color.White else Color(0xFF1A1A2E),
                            fontSize = 15.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(
                        modifier = Modifier.align(Alignment.End),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (message.isEdited && !message.isDeleted) {
                            Text(
                                text = "edited",
                                fontSize = 10.sp,
                                color = if (isOwn) Color.White.copy(alpha = 0.6f) else Color.Gray,
                                fontStyle = FontStyle.Italic
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                        Text(
                            text = timeString,
                            fontSize = 10.sp,
                            color = if (isOwn) Color.White.copy(alpha = 0.6f) else Color.Gray
                        )
                        if (isOwn) {
                            Spacer(modifier = Modifier.width(3.dp))
                            Icon(
                                imageVector = when (message.status) {
                                    MessageStatus.READ -> Icons.Default.DoneAll
                                    MessageStatus.DELIVERED -> Icons.Default.DoneAll
                                    else -> Icons.Default.Done
                                },
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = if (message.status == MessageStatus.READ) Color(0xFF90CAF9) else Color.White.copy(alpha = 0.6f)
                            )
                        }
                    }
                }
            }
        }
        
        // Reactions display
        if (message.reactions.isNotEmpty() && !message.isDeleted) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 2.dp),
                horizontalArrangement = if (isOwn) Arrangement.End else Arrangement.Start
            ) {
                message.reactions.forEach { (emoji, users) ->
                    if (users.isNotEmpty()) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (users.contains(currentUserId)) 
                                Color(0xFFE3F2FD) else Color.White,
                            modifier = Modifier
                                .padding(end = 4.dp)
                                .clickable { onReactionClick(emoji) }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = emoji, fontSize = 12.sp)
                                Spacer(modifier = Modifier.width(2.dp))
                                Text(
                                    text = users.size.toString(),
                                    fontSize = 11.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MessageMenuDialog(
    message: Message,
    currentUserId: String,
    onDismiss: () -> Unit,
    onReaction: (String) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onReply: () -> Unit = {},
    onForward: () -> Unit = {},
    onStar: () -> Unit = {}
) {
    val isOwn = message.senderId == currentUserId
    val context = LocalContext.current
    var isStarred by remember { mutableStateOf(false) }
    
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            contentColor = Color(0xFF1A1A2E)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Quick reactions row
                Text(
                    text = "React",
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF1A1A2E),
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(QUICK_REACTIONS) { emoji ->
                        val hasReacted = message.reactions[emoji]?.contains(currentUserId) == true
                        Surface(
                            shape = CircleShape,
                            color = if (hasReacted) Color(0xFFE3F2FD) else Color(0xFFF5F5F5),
                            modifier = Modifier.clickable { onReaction(emoji) }
                        ) {
                            Text(
                                text = emoji,
                                fontSize = 24.sp,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }
                }
                
                Divider(modifier = Modifier.padding(vertical = 12.dp))

                // Reply
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onReply(); onDismiss() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Reply, contentDescription = null, tint = Color(0xFF246BFD))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Reply", color = Color(0xFF1A1A2E))
                }

                // Forward
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            val sendIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(Intent.EXTRA_TEXT, message.content ?: "")
                                type = "text/plain"
                            }
                            context.startActivity(Intent.createChooser(sendIntent, "Forward to..."))
                            onDismiss()
                        }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Forward, contentDescription = null, tint = Color(0xFF246BFD))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Forward", color = Color(0xFF1A1A2E))
                }

                // Star
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            isStarred = !isStarred
                            Toast.makeText(
                                context,
                                if (isStarred) "Message starred" else "Message unstarred",
                                Toast.LENGTH_SHORT
                            ).show()
                            onStar()
                            onDismiss()
                        }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        if (isStarred) Icons.Default.Star else Icons.Default.StarBorder,
                        contentDescription = null,
                        tint = Color(0xFFFFC107)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(if (isStarred) "Unstar" else "Star", color = Color(0xFF1A1A2E))
                }

                // Copy
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val clip = ClipData.newPlainText("message", message.content ?: "")
                            clipboard.setPrimaryClip(clip)
                            Toast.makeText(context, "Message copied", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, tint = Color(0xFF607D8B))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Copy", color = Color(0xFF1A1A2E))
                }
                
                // Edit (own messages only, within 15 min)
                if (isOwn) {
                    val canEdit = System.currentTimeMillis() - message.createdAt < 15 * 60 * 1000
                    if (canEdit) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onEdit() }
                                .padding(vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, tint = Color(0xFF1A56DB))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Edit", color = Color(0xFF1A1A2E))
                        }
                    }
                }
                
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
                    Text("Delete", color = Color.Red)
                }
            }
        }
    }
}

@Composable
fun EditMessageDialog(
    content: String,
    onContentChange: (String) -> Unit,
    onDismiss: () -> Unit,
    onSave: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            contentColor = Color(0xFF1A1A2E)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Edit Message",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                    color = Color(0xFF1A1A2E)
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = content,
                    onValueChange = onContentChange,
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )
                Spacer(modifier = Modifier.height(16.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = onSave,
                        enabled = content.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF246BFD)
                        )
                    ) {
                        Text("Save")
                    }
                }
            }
        }
    }
}

@Composable
fun DeleteMessageDialog(
    isOwn: Boolean,
    onDismiss: () -> Unit,
    onDeleteForMe: () -> Unit,
    onDeleteForEveryone: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            contentColor = Color(0xFF1A1A2E)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Delete Message",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                    color = Color(0xFF1A1A2E)
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                TextButton(
                    onClick = onDeleteForMe,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Delete for me", color = Color.Red)
                }
                
                if (isOwn) {
                    TextButton(
                        onClick = onDeleteForEveryone,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Delete for everyone", color = Color.Red)
                    }
                }
                
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
