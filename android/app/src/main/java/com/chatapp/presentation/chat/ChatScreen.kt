package com.chatapp.presentation.chat

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import com.chatapp.domain.model.Message
import com.chatapp.domain.model.MessageStatus
import com.chatapp.presentation.media.MediaPickerHelper
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.roundToInt
import kotlinx.coroutines.delay as kDelay

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

    // Multi-message selection
    var isSelectMode by remember { mutableStateOf(false) }
    var selectedMessages by remember { mutableStateOf(setOf<String>()) }

    // Seen-by dialog
    var showSeenByMessageId by remember { mutableStateOf<String?>(null) }

    // Activity result launchers for attachments with file validation
    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val validation = MediaPickerHelper.validateFile(context, it, "image")
            if (validation.isValid) {
                Toast.makeText(context, "Uploading image...", Toast.LENGTH_SHORT).show()
                viewModel.sendMediaMessage(context, it, "image")
            } else {
                Toast.makeText(context, validation.errorMessage ?: "Invalid file", Toast.LENGTH_LONG).show()
            }
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
            val validation = MediaPickerHelper.validateFile(context, it, "file")
            if (validation.isValid) {
                Toast.makeText(context, "Uploading document...", Toast.LENGTH_SHORT).show()
                viewModel.sendMediaMessage(context, it, "file")
            } else {
                Toast.makeText(context, validation.errorMessage ?: "Invalid file", Toast.LENGTH_LONG).show()
            }
        }
    }

    // Video launcher with validation
    val videoLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            val validation = MediaPickerHelper.validateFile(context, it, "video")
            if (validation.isValid) {
                Toast.makeText(context, "Uploading video...", Toast.LENGTH_SHORT).show()
                viewModel.sendMediaMessage(context, it, "video")
            } else {
                Toast.makeText(context, validation.errorMessage ?: "Invalid file", Toast.LENGTH_LONG).show()
            }
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
            },
            onSelectMessages = {
                isSelectMode = true
                selectedMessages = setOf(selectedMessage!!.id)
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
                                color = MaterialTheme.colorScheme.primary
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
                                        .background(MaterialTheme.colorScheme.tertiary, CircleShape)
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
                            if (effectiveTyping) {
                                TypingIndicator()
                            } else {
                                Text(
                                    text = if (effectiveOnline) "online" else "offline",
                                    fontSize = 11.sp,
                                    color = Color.White.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White
                ),
                actions = {
                    IconButton(onClick = { onVideoCall(uiState.otherUserId.ifEmpty { chatId }) }) {
                        Icon(
                            Icons.Default.Videocam,
                            contentDescription = "Video Call",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = { onCall(uiState.otherUserId.ifEmpty { chatId }) }) {
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
                .background(MaterialTheme.colorScheme.background)
        ) {
            // E2E encryption indicator (WhatsApp-style)
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Lock,
                        contentDescription = null,
                        modifier = Modifier.size(10.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Messages are end-to-end encrypted. Tap to learn more.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                    )
                }
            }

            // Connection status banner (offline/reconnecting)
            AnimatedVisibility(
                visible = !uiState.isSocketConnected,
                enter = slideInVertically(),
                exit = slideOutVertically()
            ) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.error
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.WifiOff, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("No internet connection — messages will be queued", color = Color.White, fontSize = 12.sp)
                    }
                }
            }

            // Upload progress indicator
            if (uiState.isUploading) {
                LinearProgressIndicator(
                    progress = uiState.uploadProgress,
                    modifier = Modifier.fillMaxWidth().height(3.dp),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
            }

            // Multi-select action bar
            if (isSelectMode) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { isSelectMode = false; selectedMessages = emptySet() }) {
                            Icon(Icons.Default.Close, contentDescription = "Cancel", tint = Color.White)
                        }
                        Text("${selectedMessages.size} selected", color = Color.White, modifier = Modifier.weight(1f))
                        IconButton(
                            onClick = {
                                selectedMessages.forEach { id -> viewModel.deleteMessage(id, false) }
                                isSelectMode = false; selectedMessages = emptySet()
                            },
                            enabled = selectedMessages.isNotEmpty()
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.White.copy(alpha = if (selectedMessages.isNotEmpty()) 1f else 0.5f))
                        }
                        IconButton(
                            onClick = {
                                val content = uiState.messages.filter { it.id in selectedMessages }.mapNotNull { it.content }.joinToString("\n")
                                val sendIntent = Intent().apply { action = Intent.ACTION_SEND; putExtra(Intent.EXTRA_TEXT, content); type = "text/plain" }
                                context.startActivity(Intent.createChooser(sendIntent, "Forward to..."))
                                isSelectMode = false; selectedMessages = emptySet()
                            },
                            enabled = selectedMessages.isNotEmpty()
                        ) {
                            Icon(Icons.Default.Forward, contentDescription = "Forward", tint = Color.White.copy(alpha = if (selectedMessages.isNotEmpty()) 1f else 0.5f))
                        }
                        IconButton(
                            onClick = {
                                Toast.makeText(context, "${selectedMessages.size} message(s) starred", Toast.LENGTH_SHORT).show()
                                isSelectMode = false; selectedMessages = emptySet()
                            },
                            enabled = selectedMessages.isNotEmpty()
                        ) {
                            Icon(Icons.Default.Star, contentDescription = "Star", tint = Color(0xFFFFC107).copy(alpha = if (selectedMessages.isNotEmpty()) 1f else 0.5f))
                        }
                    }
                }
            }

            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            } else {
                val listState = rememberLazyListState()
                
                // Auto-scroll to bottom when new messages arrive
                LaunchedEffect(uiState.messages.size) {
                    if (uiState.messages.isNotEmpty()) {
                        listState.animateScrollToItem(uiState.messages.size - 1)
                    }
                }

                // Infinite scroll — load more when near the top
                val firstVisibleIndex by remember { derivedStateOf { listState.firstVisibleItemIndex } }
                LaunchedEffect(firstVisibleIndex) {
                    if (firstVisibleIndex <= 3 && !uiState.isLoadingMore && uiState.hasMoreMessages && uiState.messages.isNotEmpty()) {
                        viewModel.loadMoreMessages()
                    }
                }
                
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp),
                    reverseLayout = false
                ) {
                    // Loading more indicator at top
                    if (uiState.isLoadingMore) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().padding(8.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }

                    items(uiState.messages, key = { it.id }) { message ->
                        val isOwn = message.senderId == uiState.currentUserId

                        if (isSelectMode) {
                            // Multi-select mode: show checkbox
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedMessages = if (message.id in selectedMessages) selectedMessages - message.id else selectedMessages + message.id
                                    }
                                    .background(if (message.id in selectedMessages) MaterialTheme.colorScheme.primary.copy(alpha = 0.08f) else Color.Transparent)
                                    .padding(vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(24.dp)
                                        .clip(CircleShape)
                                        .border(2.dp, if (message.id in selectedMessages) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline, CircleShape)
                                        .background(if (message.id in selectedMessages) MaterialTheme.colorScheme.primary else Color.Transparent),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (message.id in selectedMessages) {
                                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    }
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Box(modifier = Modifier.weight(1f)) {
                                    MessageBubble(
                                        message = message,
                                        currentUserId = uiState.currentUserId,
                                        onLongPress = {},
                                        onReactionClick = {},
                                        onRetry = {},
                                        showSeenBy = false,
                                        onSeenByClick = {}
                                    )
                                }
                            }
                        } else {
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
                                },
                                onRetry = { viewModel.retryMessage(message) },
                                showSeenBy = isOwn && message.status == MessageStatus.READ,
                                onSeenByClick = {
                                    showSeenByMessageId = if (showSeenByMessageId == message.id) null else message.id
                                },
                                isSeenByExpanded = showSeenByMessageId == message.id
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }
            }

            // Reply preview
            if (replyToMessage != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surfaceVariant
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
                                .background(MaterialTheme.colorScheme.primary)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Reply to",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = replyToMessage?.content?.take(50) ?: "",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1
                            )
                        }
                        IconButton(onClick = { replyToMessage = null }) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Cancel reply",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Attachment menu
            if (showAttachMenu) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        AttachmentOption(Icons.Default.Image, "Gallery", MaterialTheme.colorScheme.tertiary) {
                            showAttachMenu = false
                            galleryLauncher.launch("image/*")
                        }
                        AttachmentOption(Icons.Default.CameraAlt, "Camera", MaterialTheme.colorScheme.primary) {
                            showAttachMenu = false
                            cameraLauncher.launch(null)
                        }
                        AttachmentOption(Icons.Default.InsertDriveFile, "Document", MaterialTheme.colorScheme.secondary) {
                            showAttachMenu = false
                            documentLauncher.launch(arrayOf("*/*"))
                        }
                        AttachmentOption(Icons.Default.LocationOn, "Location", MaterialTheme.colorScheme.secondary) {
                            showAttachMenu = false
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q="))
                            try { context.startActivity(intent) } catch (_: Exception) {
                                Toast.makeText(context, "No map app found", Toast.LENGTH_SHORT).show()
                            }
                        }
                        AttachmentOption(Icons.Default.Person, "Contact", MaterialTheme.colorScheme.onSurfaceVariant) {
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
                color = MaterialTheme.colorScheme.surface
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
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    TextField(
                        value = messageText,
                        onValueChange = { newText ->
                            messageText = newText
                            if (newText.isNotEmpty()) viewModel.sendTypingStart()
                            else viewModel.sendTypingStop()
                        },
                        placeholder = { Text("Type a message", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(24.dp)),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                            focusedTextColor = MaterialTheme.colorScheme.onSurface,
                            unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                            cursorColor = MaterialTheme.colorScheme.primary,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        )
                    )

                    IconButton(onClick = { showAttachMenu = !showAttachMenu; showEmojiPicker = false }) {
                        Icon(Icons.Default.AttachFile, contentDescription = "Attach", tint = MaterialTheme.colorScheme.onSurfaceVariant)
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
                        containerColor = MaterialTheme.colorScheme.primary,
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

            // Enhanced Emoji/GIF/Sticker picker
            if (showEmojiPicker) {
                EnhancedEmojiPickerView(
                    onEmojiSelected = { emoji -> messageText += emoji },
                    onGifSelected = { gifUrl ->
                        viewModel.sendMessage(gifUrl, null)
                        showEmojiPicker = false
                    },
                    onStickerSelected = { stickerEmoji ->
                        viewModel.sendMessage(stickerEmoji, null)
                        showEmojiPicker = false
                    },
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
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun SwipeableMessageBubble(
    message: Message,
    currentUserId: String,
    onLongPress: () -> Unit,
    onReactionClick: (String) -> Unit,
    onSwipeToReply: () -> Unit,
    onRetry: () -> Unit = {},
    showSeenBy: Boolean = false,
    onSeenByClick: () -> Unit = {},
    isSeenByExpanded: Boolean = false
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
                    tint = MaterialTheme.colorScheme.primary.copy(alpha = (animatedOffsetX / swipeThreshold).coerceIn(0f, 1f)),
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
                onReactionClick = onReactionClick,
                onRetry = onRetry,
                showSeenBy = showSeenBy,
                onSeenByClick = onSeenByClick
            )
        }
    }

    // Seen-by expanded row
    if (isSeenByExpanded && showSeenBy) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = if (isOwn) 48.dp else 8.dp, end = if (isOwn) 8.dp else 48.dp, top = 2.dp),
            horizontalArrangement = if (isOwn) Arrangement.End else Arrangement.Start
        ) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Read", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MessageBubble(
    message: Message,
    currentUserId: String,
    onLongPress: () -> Unit,
    onReactionClick: (String) -> Unit,
    onRetry: () -> Unit = {},
    showSeenBy: Boolean = false,
    onSeenByClick: () -> Unit = {}
) {
    val isOwn = message.senderId == currentUserId
    val timeFormat = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }
    val timeString = timeFormat.format(Date(message.createdAt))
    val isFailed = message.status == MessageStatus.FAILED

    // Extract URLs from message content for link preview
    val urlRegex = remember { Regex("https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+") }
    val detectedUrl = remember(message.content) { message.content?.let { urlRegex.find(it)?.value } }
    
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (isOwn) Arrangement.End else Arrangement.Start,
            verticalAlignment = Alignment.Bottom
        ) {
            // Retry button for failed messages (left side for own messages)
            if (isFailed && isOwn) {
                IconButton(
                    onClick = onRetry,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = "Retry",
                        tint = Color.Red,
                        modifier = Modifier.size(20.dp)
                    )
                }
                Spacer(modifier = Modifier.width(4.dp))
            }

            Surface(
                shape = RoundedCornerShape(
                    topStart = 12.dp,
                    topEnd = 12.dp,
                    bottomStart = if (isOwn) 12.dp else 0.dp,
                    bottomEnd = if (isOwn) 0.dp else 12.dp
                ),
                color = if (message.isDeleted) Color.LightGray.copy(alpha = 0.5f)
                        else if (isFailed) Color.Red.copy(alpha = 0.15f)
                        else if (isOwn) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                modifier = Modifier
                    .widthIn(max = 280.dp)
                    .combinedClickable(
                        onClick = { /* Single tap does nothing - use long press for menu */ },
                        onLongClick = onLongPress
                    )
            ) {
                Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                    if (message.isDeleted) {
                        Text(
                            text = "This message was deleted",
                            fontStyle = FontStyle.Italic,
                            color = if (isOwn) Color.White.copy(alpha = 0.7f) else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        // Voice waveform for audio messages
                        if (message.type == com.chatapp.domain.model.MessageType.AUDIO) {
                            AudioWaveformPlayer(
                                messageId = message.id,
                                isOwn = isOwn
                            )
                        }

                        // Text content
                        if (!message.content.isNullOrBlank()) {
                            Text(
                                text = message.content,
                                color = if (isFailed) Color.Red
                                        else if (isOwn) Color.White else MaterialTheme.colorScheme.onSurface,
                                fontSize = 15.sp
                            )
                        }

                        // Link preview
                        if (detectedUrl != null && message.type == com.chatapp.domain.model.MessageType.TEXT) {
                            Spacer(modifier = Modifier.height(6.dp))
                            LinkPreviewCard(url = detectedUrl, isOwn = isOwn)
                        }
                    }
                    Spacer(modifier = Modifier.height(2.dp))
                    Row(
                        modifier = Modifier.align(Alignment.End),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (isFailed) {
                            Text(
                                text = "Failed",
                                fontSize = 10.sp,
                                color = Color.Red,
                                fontStyle = FontStyle.Italic
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                        if (message.isEdited && !message.isDeleted) {
                            Text(
                                text = "edited",
                                fontSize = 10.sp,
                                color = if (isOwn) Color.White.copy(alpha = 0.6f) else MaterialTheme.colorScheme.onSurfaceVariant,
                                fontStyle = FontStyle.Italic
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                        // Seen-by eye icon
                        if (showSeenBy) {
                            Icon(
                                Icons.Default.Visibility,
                                contentDescription = "Seen by",
                                modifier = Modifier.size(12.dp).clickable { onSeenByClick() },
                                tint = MaterialTheme.colorScheme.primaryContainer
                            )
                            Spacer(modifier = Modifier.width(3.dp))
                        }
                        Text(
                            text = timeString,
                            fontSize = 10.sp,
                            color = if (isFailed) Color.Red.copy(alpha = 0.7f)
                                    else if (isOwn) Color.White.copy(alpha = 0.6f) else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (isOwn && !isFailed) {
                            Spacer(modifier = Modifier.width(3.dp))
                            Icon(
                                imageVector = when (message.status) {
                                    MessageStatus.READ -> Icons.Default.DoneAll
                                    MessageStatus.DELIVERED -> Icons.Default.DoneAll
                                    else -> Icons.Default.Done
                                },
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = if (message.status == MessageStatus.READ) MaterialTheme.colorScheme.primaryContainer else Color.White.copy(alpha = 0.6f)
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
                                MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
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
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// Voice message waveform visualization
@Composable
fun AudioWaveformPlayer(
    messageId: String,
    isOwn: Boolean
) {
    // Generate deterministic waveform bars from message ID
    val waveformBars = remember(messageId) {
        val seed = messageId.hashCode().toLong()
        val random = Random(seed)
        List(24) { 0.15f + random.nextFloat() * 0.85f }
    }
    var isPlaying by remember { mutableStateOf(false) }
    var playbackProgress by remember { mutableFloatStateOf(0f) }
    var playbackSpeed by remember { mutableFloatStateOf(1f) }

    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(vertical = 4.dp)
        ) {
            // Play/Pause button
            IconButton(
                onClick = { isPlaying = !isPlaying },
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = if (isPlaying) "Pause" else "Play",
                    tint = if (isOwn) Color.White else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
            }

            // Waveform bars
            Row(
                modifier = Modifier.weight(1f).height(32.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(1.dp)
            ) {
                waveformBars.forEachIndexed { index, amplitude ->
                    val barProgress = index.toFloat() / waveformBars.size
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight(amplitude)
                            .clip(RoundedCornerShape(1.dp))
                            .background(
                                if (barProgress <= playbackProgress)
                                    if (isOwn) Color.White else MaterialTheme.colorScheme.primary
                                else
                                    if (isOwn) Color.White.copy(alpha = 0.3f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                            )
                    )
                }
            }

            Spacer(modifier = Modifier.width(4.dp))

            // Speed toggle
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = if (isOwn) Color.White.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.clickable {
                    playbackSpeed = when (playbackSpeed) {
                        1f -> 1.5f
                        1.5f -> 2f
                        else -> 1f
                    }
                }
            ) {
                Text(
                    text = "${playbackSpeed}x",
                    fontSize = 10.sp,
                    color = if (isOwn) Color.White else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

// Link preview card
@Composable
fun LinkPreviewCard(url: String, isOwn: Boolean) {
    val domain = remember(url) {
        try { Uri.parse(url).host ?: url } catch (_: Exception) { url }
    }
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isOwn) Color.White.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Link,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = if (isOwn) Color.White.copy(alpha = 0.7f) else MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = domain,
                    fontSize = 11.sp,
                    color = if (isOwn) Color.White.copy(alpha = 0.7f) else MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = url,
                fontSize = 12.sp,
                color = if (isOwn) Color.White.copy(alpha = 0.5f) else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
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
    onStar: () -> Unit = {},
    onSelectMessages: () -> Unit = {}
) {
    val isOwn = message.senderId == currentUserId
    val context = LocalContext.current
    var isStarred by remember { mutableStateOf(false) }
    
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                // Quick reactions row
                Text(
                    text = "React",
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(QUICK_REACTIONS) { emoji ->
                        val hasReacted = message.reactions[emoji]?.contains(currentUserId) == true
                        Surface(
                            shape = CircleShape,
                            color = if (hasReacted) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
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
                    Icon(Icons.Default.Reply, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Reply", color = MaterialTheme.colorScheme.onSurface)
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
                    Icon(Icons.Default.Forward, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Forward", color = MaterialTheme.colorScheme.onSurface)
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
                    Text(if (isStarred) "Unstar" else "Star", color = MaterialTheme.colorScheme.onSurface)
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
                    Icon(Icons.Default.ContentCopy, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Copy", color = MaterialTheme.colorScheme.onSurface)
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
                            Icon(Icons.Default.Edit, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Edit", color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
                
                // Select messages (multi-select mode)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectMessages(); onDismiss() }
                        .padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CheckBox, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Select messages", color = MaterialTheme.colorScheme.onSurface)
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
            color = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Edit Message",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface
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
                        Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = onSave,
                        enabled = content.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary
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
            color = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Delete Message",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface
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
                    Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
fun TypingIndicator() {
    val infiniteTransition = rememberInfiniteTransition(label = "typing")
    val dot1 by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = keyframes { durationMillis = 1200; 1f at 200; 0f at 400 },
            repeatMode = RepeatMode.Restart
        ), label = "dot1"
    )
    val dot2 by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = keyframes { durationMillis = 1200; 0f at 200; 1f at 400; 0f at 600 },
            repeatMode = RepeatMode.Restart
        ), label = "dot2"
    )
    val dot3 by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = keyframes { durationMillis = 1200; 0f at 400; 1f at 600; 0f at 800 },
            repeatMode = RepeatMode.Restart
        ), label = "dot3"
    )

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Text("typing", fontSize = 11.sp, color = Color.White.copy(alpha = 0.7f))
        listOf(dot1, dot2, dot3).forEach { anim ->
            Box(
                modifier = Modifier
                    .size(4.dp)
                    .offset(y = (-2 * anim).dp)
                    .background(Color.White.copy(alpha = 0.5f + 0.5f * anim), CircleShape)
            )
        }
    }
}
