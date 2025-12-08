package com.chatapp.presentation.chat

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import com.chatapp.domain.model.Message
import com.chatapp.domain.model.MessageStatus
import java.text.SimpleDateFormat
import java.util.*

val QUICK_REACTIONS = listOf("👍", "❤️", "😂", "😮", "😢", "🙏")

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(
    chatId: String,
    onBack: () -> Unit,
    currentUserId: String = "current-user",
    viewModel: ChatViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    var messageText by remember { mutableStateOf("") }
    var selectedMessage by remember { mutableStateOf<Message?>(null) }
    var showReactionPicker by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var editingContent by remember { mutableStateOf("") }

    // Load messages when screen opens
    LaunchedEffect(chatId) {
        viewModel.loadMessages(chatId, currentUserId)
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
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape),
                            color = Color(0xFF25D366)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "J",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text("John Doe", fontSize = 16.sp)
                            Text("online", fontSize = 12.sp, color = Color.White.copy(alpha = 0.7f))
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF128C7E),
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFECE5DD))
        ) {
            if (uiState.isLoading) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF25D366))
                }
            } else {
                val listState = rememberLazyListState()
                
                LazyColumn(
                    state = listState,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp),
                    reverseLayout = false
                ) {
                    items(uiState.messages, key = { it.id }) { message ->
                        MessageBubble(
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
                            }
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFFF0F0F0)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        placeholder = { Text("Type a message") },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(24.dp)),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        )
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    FloatingActionButton(
                        onClick = { 
                            if (messageText.isNotBlank()) {
                                viewModel.sendMessage(messageText)
                                messageText = ""
                            }
                        },
                        containerColor = Color(0xFF25D366),
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
                        else if (isOwn) Color(0xFFDCF8C6) else Color.White,
                modifier = Modifier
                    .widthIn(max = 280.dp)
                    .combinedClickable(
                        onClick = { },
                        onLongClick = onLongPress
                    )
            ) {
                Column(modifier = Modifier.padding(8.dp)) {
                    if (message.isDeleted) {
                        Text(
                            text = "This message was deleted",
                            fontStyle = FontStyle.Italic,
                            color = Color.Gray
                        )
                    } else {
                        Text(text = message.content ?: "")
                    }
                    Row(
                        modifier = Modifier.align(Alignment.End),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (message.isEdited && !message.isDeleted) {
                            Text(
                                text = "edited",
                                fontSize = 10.sp,
                                color = Color.Gray,
                                fontStyle = FontStyle.Italic
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                        Text(
                            text = timeString,
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                        if (isOwn) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                imageVector = when (message.status) {
                                    MessageStatus.READ -> Icons.Default.DoneAll
                                    MessageStatus.DELIVERED -> Icons.Default.DoneAll
                                    else -> Icons.Default.Done
                                },
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = if (message.status == MessageStatus.READ) Color(0xFF34B7F1) else Color.Gray
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
    onDelete: () -> Unit
) {
    val isOwn = message.senderId == currentUserId
    
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "React",
                    fontWeight = FontWeight.SemiBold,
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
                
                if (isOwn) {
                    val canEdit = System.currentTimeMillis() - message.createdAt < 15 * 60 * 1000
                    if (canEdit) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onEdit() }
                                .padding(vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Edit, contentDescription = null, tint = Color(0xFF128C7E))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Edit")
                        }
                    }
                }
                
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onDelete() }
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Delete, contentDescription = null, tint = Color.Red)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Delete", color = Color.Red)
                }
                
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onDismiss() }
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, tint = Color.Gray)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Copy")
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
            color = Color.White
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Edit Message",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp
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
                            containerColor = Color(0xFF25D366)
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
            color = Color.White
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Delete Message",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp
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
