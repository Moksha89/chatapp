package com.chatapp.presentation.chat

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

data class MessageItem(
    val id: String,
    val content: String,
    val time: String,
    val isOwn: Boolean,
    val status: String = "sent",
    val reactions: Map<String, List<String>> = emptyMap(),
    val isEdited: Boolean = false,
    val isDeleted: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

val QUICK_REACTIONS = listOf("👍", "❤️", "😂", "😮", "😢", "🙏")

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ChatScreen(
    chatId: String,
    onBack: () -> Unit,
    currentUserId: String = "current-user"
) {
    var messageText by remember { mutableStateOf("") }
    var selectedMessage by remember { mutableStateOf<MessageItem?>(null) }
    var showReactionPicker by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var editingContent by remember { mutableStateOf("") }

    val sampleMessages = remember {
        mutableStateListOf(
            MessageItem("1", "Hello! How are you?", "10:30 AM", false),
            MessageItem("2", "I'm doing great, thanks!", "10:31 AM", true, "read", 
                reactions = mapOf("👍" to listOf("user1"))),
            MessageItem("3", "That's wonderful to hear!", "10:32 AM", false),
            MessageItem("4", "Would you like to meet up later?", "10:33 AM", true, "delivered")
        )
    }

    // Message Menu Dialog
    if (showReactionPicker && selectedMessage != null) {
        MessageMenuDialog(
            message = selectedMessage!!,
            currentUserId = currentUserId,
            onDismiss = { 
                showReactionPicker = false 
                selectedMessage = null
            },
            onReaction = { emoji ->
                val index = sampleMessages.indexOfFirst { it.id == selectedMessage!!.id }
                if (index >= 0) {
                    val currentReactions = sampleMessages[index].reactions.toMutableMap()
                    val users = currentReactions[emoji]?.toMutableList() ?: mutableListOf()
                    if (users.contains(currentUserId)) {
                        users.remove(currentUserId)
                    } else {
                        users.add(currentUserId)
                    }
                    if (users.isEmpty()) {
                        currentReactions.remove(emoji)
                    } else {
                        currentReactions[emoji] = users
                    }
                    sampleMessages[index] = sampleMessages[index].copy(reactions = currentReactions)
                }
                showReactionPicker = false
                selectedMessage = null
            },
            onEdit = {
                editingContent = selectedMessage!!.content
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
                val index = sampleMessages.indexOfFirst { it.id == selectedMessage!!.id }
                if (index >= 0) {
                    sampleMessages[index] = sampleMessages[index].copy(
                        content = editingContent,
                        isEdited = true
                    )
                }
                showEditDialog = false
                selectedMessage = null
            }
        )
    }

    // Delete Dialog
    if (showDeleteDialog && selectedMessage != null) {
        DeleteMessageDialog(
            isOwn = selectedMessage!!.isOwn,
            onDismiss = { 
                showDeleteDialog = false
                selectedMessage = null
            },
            onDeleteForMe = {
                val index = sampleMessages.indexOfFirst { it.id == selectedMessage!!.id }
                if (index >= 0) {
                    sampleMessages.removeAt(index)
                }
                showDeleteDialog = false
                selectedMessage = null
            },
            onDeleteForEveryone = {
                val index = sampleMessages.indexOfFirst { it.id == selectedMessage!!.id }
                if (index >= 0) {
                    sampleMessages[index] = sampleMessages[index].copy(
                        isDeleted = true,
                        content = "This message was deleted"
                    )
                }
                showDeleteDialog = false
                selectedMessage = null
            }
        )
    }

    Scaffold(
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
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 8.dp),
                reverseLayout = false
            ) {
                items(sampleMessages) { message ->
                    MessageBubble(
                        message = message,
                        currentUserId = currentUserId,
                        onLongPress = {
                            if (!message.isDeleted) {
                                selectedMessage = message
                                showReactionPicker = true
                            }
                        },
                        onReactionClick = { emoji ->
                            // Toggle reaction
                            val index = sampleMessages.indexOfFirst { it.id == message.id }
                            if (index >= 0) {
                                val currentReactions = message.reactions.toMutableMap()
                                val users = currentReactions[emoji]?.toMutableList() ?: mutableListOf()
                                if (users.contains(currentUserId)) {
                                    users.remove(currentUserId)
                                } else {
                                    users.add(currentUserId)
                                }
                                if (users.isEmpty()) {
                                    currentReactions.remove(emoji)
                                } else {
                                    currentReactions[emoji] = users
                                }
                                sampleMessages[index] = message.copy(reactions = currentReactions)
                            }
                        }
                    )
                    Spacer(modifier = Modifier.height(4.dp))
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
                        onClick = { messageText = "" },
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
    message: MessageItem,
    currentUserId: String,
    onLongPress: () -> Unit,
    onReactionClick: (String) -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (message.isOwn) Arrangement.End else Arrangement.Start
        ) {
            Surface(
                shape = RoundedCornerShape(
                    topStart = 12.dp,
                    topEnd = 12.dp,
                    bottomStart = if (message.isOwn) 12.dp else 0.dp,
                    bottomEnd = if (message.isOwn) 0.dp else 12.dp
                ),
                color = if (message.isDeleted) Color.LightGray.copy(alpha = 0.5f)
                        else if (message.isOwn) Color(0xFFDCF8C6) else Color.White,
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
                        Text(text = message.content)
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
                            text = message.time,
                            fontSize = 11.sp,
                            color = Color.Gray
                        )
                        if (message.isOwn) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                imageVector = when (message.status) {
                                    "read" -> Icons.Default.DoneAll
                                    "delivered" -> Icons.Default.DoneAll
                                    else -> Icons.Default.Done
                                },
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = if (message.status == "read") Color(0xFF34B7F1) else Color.Gray
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
                horizontalArrangement = if (message.isOwn) Arrangement.End else Arrangement.Start
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
    message: MessageItem,
    currentUserId: String,
    onDismiss: () -> Unit,
    onReaction: (String) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
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
                
                if (message.isOwn) {
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
