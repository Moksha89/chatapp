package com.chatapp.presentation.contacts

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContactSyncScreen(
    onBack: () -> Unit,
    onContactClick: (String) -> Unit = {},
    viewModel: ContactSyncViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadContacts() }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.error) {
        uiState.error?.let { snackbarHostState.showSnackbar(it) }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Contacts") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A56DB),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                ),
                actions = {
                    IconButton(onClick = { viewModel.syncContacts() }) {
                        Icon(Icons.Default.Sync, contentDescription = "Sync", tint = Color.White)
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = Color(0xFF1A56DB))
            } else if (uiState.contacts.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Default.Contacts, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color.Gray)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("No contacts yet", color = Color.Gray)
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = { viewModel.syncContacts() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A56DB))
                    ) {
                        Icon(Icons.Default.Sync, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Sync Contacts")
                    }
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    // Registered contacts
                    val registered = uiState.contacts.filter { it.isRegistered }
                    val unregistered = uiState.contacts.filter { !it.isRegistered }

                    if (registered.isNotEmpty()) {
                        item {
                            Text(
                                "On WhatsApp Business",
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1A56DB),
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                        items(registered) { contact ->
                            ContactRow(contact = contact, onClick = { onContactClick(contact.id) })
                            Divider(modifier = Modifier.padding(start = 68.dp))
                        }
                    }

                    if (unregistered.isNotEmpty()) {
                        item {
                            Text(
                                "Invite to WhatsApp Business",
                                fontWeight = FontWeight.Bold,
                                color = Color.Gray,
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                        items(unregistered) { contact ->
                            ContactRow(contact = contact, showInvite = true)
                            Divider(modifier = Modifier.padding(start = 68.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ContactRow(
    contact: ContactUiItem,
    showInvite: Boolean = false,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape),
            color = if (contact.isRegistered) Color(0xFF246BFD) else Color.Gray
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = contact.displayName.firstOrNull()?.toString() ?: "?",
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(contact.displayName, fontWeight = FontWeight.Medium)
            Text(contact.phoneNumber, color = Color.Gray, fontSize = 13.sp)
        }
        if (showInvite) {
            TextButton(onClick = {}) {
                Text("Invite", color = Color(0xFF1A56DB))
            }
        }
    }
}

data class ContactUiItem(
    val id: String,
    val displayName: String,
    val phoneNumber: String,
    val isRegistered: Boolean
)
