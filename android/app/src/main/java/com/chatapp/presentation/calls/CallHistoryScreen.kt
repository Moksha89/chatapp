package com.chatapp.presentation.calls

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CallHistoryScreen(
    onBack: () -> Unit,
    onCallUser: (String, String) -> Unit = { _, _ -> },
    viewModel: CallHistoryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadCallHistory() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Calls") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (uiState.calls.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("No call history", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Your calls will appear here", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(uiState.calls) { call ->
                        val callerName = call.caller?.displayName ?: call.receiver?.displayName ?: "Unknown"
                        val isMissed = call.status == "missed"
                        val isIncoming = call.receiver != null

                        ListItem(
                            headlineContent = {
                                Text(
                                    callerName,
                                    color = if (isMissed) Color(0xFFF44336) else MaterialTheme.colorScheme.onSurface
                                )
                            },
                            supportingContent = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        if (isIncoming) Icons.Default.CallReceived else Icons.Default.CallMade,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp),
                                        tint = if (isMissed) Color(0xFFF44336) else Color(0xFF4CAF50)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        "${call.type} - ${call.createdAt ?: ""}",
                                        fontSize = 13.sp
                                    )
                                }
                            },
                            trailingContent = {
                                IconButton(onClick = {
                                    val targetId = call.receiver?.id ?: call.caller?.id ?: ""
                                    onCallUser(targetId, call.type)
                                }) {
                                    Icon(
                                        if (call.type == "video") Icons.Default.Videocam else Icons.Default.Phone,
                                        contentDescription = "Call",
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        )
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}
