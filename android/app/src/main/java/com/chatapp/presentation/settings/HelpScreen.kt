package com.chatapp.presentation.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var showFaqDialog by remember { mutableStateOf(false) }
    var selectedFaq by remember { mutableStateOf<Pair<String, String>?>(null) }

    val faqs = listOf(
        "How do I send a message?" to "Open a chat, type your message in the text field at the bottom, and tap the send button.",
        "How do I create a group?" to "Go to the chat list, tap the menu icon, select 'New Group', add participants, set a group name, and tap 'Create'.",
        "How do I make a voice or video call?" to "Open a chat with a contact, then tap the phone icon for a voice call or the video icon for a video call.",
        "How do I change my profile?" to "Go to Settings > Business Profile to update your name, about, and business information.",
        "How do I block a contact?" to "Go to Settings > Privacy > Blocked Contacts to manage your blocked contacts list.",
        "How do I set up auto-replies?" to "Go to Settings > Auto-Reply Messages to create greeting and away messages.",
        "How do I create labels?" to "Go to Settings > Labels to create and manage labels for organizing your chats.",
        "How do I send media files?" to "In a chat, tap the attachment icon to send images, documents, location, or contacts.",
        "How do I backup my chats?" to "Go to Settings > Chat Backup to export and backup your chat history.",
        "How do I manage notifications?" to "Go to Settings > Notifications to customize message, group, and call notification preferences."
    )

    if (showFaqDialog && selectedFaq != null) {
        AlertDialog(
            onDismissRequest = { showFaqDialog = false },
            title = { Text(selectedFaq!!.first, fontWeight = FontWeight.SemiBold) },
            text = { Text(selectedFaq!!.second) },
            confirmButton = {
                TextButton(onClick = { showFaqDialog = false }) {
                    Text("Got it", color = Color(0xFF1A56DB))
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Help") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A56DB),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Help Center
            item {
                Text(
                    text = "Help Center",
                    color = Color(0xFF1A56DB),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 8.dp)
                )
            }

            item {
                HelpItem(
                    icon = Icons.Default.QuestionAnswer,
                    title = "FAQ",
                    subtitle = "Frequently asked questions",
                    onClick = {
                        selectedFaq = faqs.first()
                        showFaqDialog = true
                    }
                )
            }

            item {
                HelpItem(
                    icon = Icons.Default.Email,
                    title = "Contact Us",
                    subtitle = "Send us an email for support",
                    onClick = {
                        val intent = Intent(Intent.ACTION_SENDTO).apply {
                            data = Uri.parse("mailto:support@abhi.so")
                            putExtra(Intent.EXTRA_SUBJECT, "Abhi Chat Support")
                        }
                        try { context.startActivity(intent) } catch (_: Exception) { }
                    }
                )
            }

            item {
                HelpItem(
                    icon = Icons.Default.Language,
                    title = "Visit Website",
                    subtitle = "Learn more about Abhi Chat",
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://abhi.so"))
                        try { context.startActivity(intent) } catch (_: Exception) { }
                    }
                )
            }

            item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }

            // FAQ Section
            item {
                Text(
                    text = "Frequently Asked Questions",
                    color = Color(0xFF1A56DB),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                )
            }

            items(faqs.size) { index ->
                val faq = faqs[index]
                HelpItem(
                    icon = Icons.Default.HelpOutline,
                    title = faq.first,
                    subtitle = "Tap to read answer",
                    onClick = {
                        selectedFaq = faq
                        showFaqDialog = true
                    }
                )
            }

            item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }

            // App Info
            item {
                Text(
                    text = "App Info",
                    color = Color(0xFF1A56DB),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                )
            }

            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = null,
                        tint = Color(0xFF1A56DB),
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text("Version", fontWeight = FontWeight.Medium, fontSize = 16.sp)
                        Text("1.0.0 (Build 1)", fontSize = 14.sp, color = Color.Gray)
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(32.dp))
                Text(
                    text = "Abhi Chat",
                    color = Color.Gray,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun HelpItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color(0xFF1A56DB),
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontWeight = FontWeight.Medium,
                fontSize = 16.sp
            )
            Text(
                text = subtitle,
                fontSize = 14.sp,
                color = Color.Gray
            )
        }
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = Color.Gray
        )
    }
}
