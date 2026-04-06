package com.chatapp.presentation.group

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateGroupScreen(
    onBack: () -> Unit,
    onGroupCreated: (String) -> Unit,
    chatType: String = "group",
    viewModel: GroupViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var groupName by remember { mutableStateOf("") }
    var searchQuery by remember { mutableStateOf("") }
    var step by remember { mutableIntStateOf(1) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.error) {
        uiState.error?.let { snackbarHostState.showSnackbar(it) }
    }

    LaunchedEffect(uiState.createdChatId) {
        uiState.createdChatId?.let { onGroupCreated(it) }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when {
                            chatType == "channel" && step == 1 -> "New Channel"
                            chatType == "channel" -> "Add Subscribers"
                            step == 1 -> "New Group"
                            else -> "Add Participants"
                        }
                    )
                },
                navigationIcon = {
                    IconButton(onClick = {
                        if (step > 1) step-- else onBack()
                    }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF246BFD),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                ),
                actions = {
                    if (step == 1 && groupName.isNotBlank()) {
                        IconButton(onClick = { step = 2; viewModel.loadContacts() }) {
                            Icon(Icons.Default.ArrowForward, contentDescription = "Next", tint = Color.White)
                        }
                    }
                    if (step == 2) {
                        IconButton(onClick = {
                            viewModel.createGroup(groupName, chatType)
                        }) {
                            Icon(Icons.Default.Check, contentDescription = "Create", tint = Color.White)
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (step == 1) {
                // Step 1: Group name
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Surface(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape),
                        color = Color(0xFF246BFD)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                if (chatType == "channel") Icons.Default.Campaign else Icons.Default.Group,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(40.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = groupName,
                        onValueChange = { groupName = it },
                        label = { Text(if (chatType == "channel") "Channel name" else "Group name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF246BFD),
                            cursorColor = Color(0xFF246BFD)
                        )
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Add members button
                    Button(
                        onClick = { step = 2; viewModel.loadContacts() },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = groupName.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF246BFD)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.GroupAdd, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Add members to group",
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (chatType == "channel")
                            "Channels are for broadcasting to large audiences"
                        else
                            "Groups allow multiple people to chat together",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                }
            } else {
                // Step 2: Select participants
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it; viewModel.searchContacts(it) },
                    label = { Text("Search contacts") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true
                )

                // Selected participants chips
                if (uiState.selectedParticipants.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        uiState.selectedParticipants.forEach { participant ->
                            AssistChip(
                                onClick = { viewModel.toggleParticipant(participant) },
                                label = { Text(participant.displayName, fontSize = 12.sp) },
                                trailingIcon = {
                                    Icon(Icons.Default.Close, contentDescription = "Remove", modifier = Modifier.size(14.dp))
                                }
                            )
                        }
                    }
                }

                if (uiState.isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF246BFD))
                    }
                } else {
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        items(uiState.contacts) { contact ->
                            val isSelected = uiState.selectedParticipants.any { it.id == contact.id }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.toggleParticipant(contact) }
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape),
                                    color = if (isSelected) Color(0xFF246BFD) else Color(0xFF90CAF9)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        if (isSelected) {
                                            Icon(Icons.Default.Check, contentDescription = null, tint = Color.White)
                                        } else {
                                            Text(
                                                text = contact.displayName.firstOrNull()?.toString() ?: "?",
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(contact.displayName, fontWeight = FontWeight.Medium)
                                    Text(contact.phoneNumber, fontSize = 12.sp, color = Color.Gray)
                                }
                            }
                            Divider(modifier = Modifier.padding(start = 68.dp))
                        }
                    }
                }
            }
        }
    }
}
