package com.chatapp.presentation.contacts

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.platform.LocalContext
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
                    containerColor = MaterialTheme.colorScheme.primary,
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
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = MaterialTheme.colorScheme.primary)
            } else if (uiState.contacts.isEmpty()) {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Default.Contacts, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("No contacts yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = { viewModel.syncContacts() },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
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
                                "On Abhi Chat",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
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
                                "Invite to Abhi Chat",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
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
    val context = LocalContext.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = contact.isRegistered, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape),
            color = if (contact.isRegistered) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
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
            Text(contact.phoneNumber, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
        }
        if (showInvite) {
            TextButton(onClick = {
                val smsUri = Uri.parse("smsto:${contact.phoneNumber}")
                val smsIntent = Intent(Intent.ACTION_SENDTO, smsUri).apply {
                    putExtra("sms_body", "Hey! I'm using Abhi Chat for messaging. Download it and let's connect! https://abhi.so")
                }
                context.startActivity(smsIntent)
            }) {
                Icon(Icons.Default.Sms, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Invite", color = MaterialTheme.colorScheme.primary)
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
