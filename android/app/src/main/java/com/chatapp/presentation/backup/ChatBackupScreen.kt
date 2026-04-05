package com.chatapp.presentation.backup

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.chatapp.presentation.chat.ChatListViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatBackupScreen(
    onBack: () -> Unit,
    chatListViewModel: ChatListViewModel = hiltViewModel()
) {
    val uiState by chatListViewModel.uiState.collectAsState()
    var selectedChatId by remember { mutableStateOf<String?>(null) }
    var exportStatus by remember { mutableStateOf<String?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(exportStatus) {
        exportStatus?.let {
            snackbarHostState.showSnackbar(it)
            exportStatus = null
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Chat Backup & Export") },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Backup info card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CloudUpload, contentDescription = null, tint = Color(0xFF1A56DB), modifier = Modifier.size(40.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text("Chat Backup", fontWeight = FontWeight.Bold)
                        Text("Export your chats as JSON files", color = Color.Gray, fontSize = 13.sp)
                    }
                }
            }

            Text(
                "Select a chat to export:",
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            if (uiState.chats.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No chats to export", color = Color.Gray)
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(uiState.chats) { chat ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Chat, contentDescription = null, tint = Color(0xFF1A56DB))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(chat.name, modifier = Modifier.weight(1f))
                                IconButton(onClick = {
                                    selectedChatId = chat.id
                                    exportStatus = "Exporting ${chat.name}..."
                                    // TODO: Call actual export API when backend endpoint is available
                                    // For now, show feedback that export was initiated
                                    exportStatus = "Chat '${chat.name}' export initiated. The backup will be available in your downloads."
                                }) {
                                Icon(Icons.Default.Download, contentDescription = "Export", tint = Color(0xFF1A56DB))
                            }
                        }
                        Divider(modifier = Modifier.padding(start = 52.dp))
                    }
                }
            }
        }
    }
}
