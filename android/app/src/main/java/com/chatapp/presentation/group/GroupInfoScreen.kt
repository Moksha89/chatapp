package com.chatapp.presentation.group

import android.content.Intent
import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class GroupMember(
    val id: String,
    val name: String,
    val phoneNumber: String = "",
    val role: String = "member"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupInfoScreen(
    chatId: String,
    groupName: String,
    onBack: () -> Unit,
    onAddMembers: () -> Unit = {},
    onChatClick: (String) -> Unit = {}
) {
    val context = LocalContext.current

    var members by remember {
        mutableStateOf(
            listOf(
                GroupMember("1", "You", "+1234567890", "admin"),
                GroupMember("2", "Alice", "+1987654321", "member"),
                GroupMember("3", "Bob", "+1555666777", "member")
            )
        )
    }
    var showRoleDialog by remember { mutableStateOf<GroupMember?>(null) }
    var showRemoveConfirm by remember { mutableStateOf<GroupMember?>(null) }
    var showShareLinkDialog by remember { mutableStateOf(false) }
    var groupDescription by remember { mutableStateOf("") }
    var isEditingDescription by remember { mutableStateOf(false) }
    var showExitGroupConfirm by remember { mutableStateOf(false) }

    // Role management dialog
    if (showRoleDialog != null) {
        AlertDialog(
            onDismissRequest = { showRoleDialog = null },
            title = { Text("Change Role") },
            text = {
                Column {
                    Text(showRoleDialog!!.name, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                val m = showRoleDialog!!
                                members = members.map { if (it.id == m.id) it.copy(role = "admin") else it }
                                Toast.makeText(context, "${m.name} is now admin", Toast.LENGTH_SHORT).show()
                                showRoleDialog = null
                            }
                            .padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = showRoleDialog!!.role == "admin", onClick = null, colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF246BFD)))
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text("Group Admin", fontWeight = FontWeight.Medium)
                            Text("Can add/remove members, change settings", fontSize = 12.sp, color = Color.Gray)
                        }
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                val m = showRoleDialog!!
                                members = members.map { if (it.id == m.id) it.copy(role = "member") else it }
                                Toast.makeText(context, "${m.name} is now member", Toast.LENGTH_SHORT).show()
                                showRoleDialog = null
                            }
                            .padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(selected = showRoleDialog!!.role == "member", onClick = null, colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF246BFD)))
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text("Member", fontWeight = FontWeight.Medium)
                            Text("Can send messages and media", fontSize = 12.sp, color = Color.Gray)
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { showRoleDialog = null }) { Text("Cancel") } }
        )
    }

    if (showRemoveConfirm != null) {
        AlertDialog(
            onDismissRequest = { showRemoveConfirm = null },
            title = { Text("Remove Member") },
            text = { Text("Remove ${showRemoveConfirm!!.name} from this group?") },
            confirmButton = {
                TextButton(onClick = {
                    val m = showRemoveConfirm!!
                    members = members.filter { it.id != m.id }
                    Toast.makeText(context, "${m.name} removed", Toast.LENGTH_SHORT).show()
                    showRemoveConfirm = null
                }) { Text("Remove", color = Color.Red) }
            },
            dismissButton = { TextButton(onClick = { showRemoveConfirm = null }) { Text("Cancel") } }
        )
    }

    if (showShareLinkDialog) {
        val inviteLink = "https://abhi.so/join/$chatId"
        AlertDialog(
            onDismissRequest = { showShareLinkDialog = false },
            title = { Text("Group Invite Link") },
            text = {
                Column {
                    Text("Share this link to invite people to this group:")
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF5F5F5), modifier = Modifier.fillMaxWidth()) {
                        Text(text = inviteLink, modifier = Modifier.padding(12.dp), fontSize = 13.sp, color = Color(0xFF246BFD))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val sendIntent = Intent().apply {
                        action = Intent.ACTION_SEND
                        putExtra(Intent.EXTRA_TEXT, "Join my group on Abhi Chat: $inviteLink")
                        type = "text/plain"
                    }
                    context.startActivity(Intent.createChooser(sendIntent, "Share invite link"))
                    showShareLinkDialog = false
                }) { Text("Share", color = Color(0xFF246BFD)) }
            },
            dismissButton = { TextButton(onClick = { showShareLinkDialog = false }) { Text("Close") } }
        )
    }

    if (showExitGroupConfirm) {
        AlertDialog(
            onDismissRequest = { showExitGroupConfirm = false },
            title = { Text("Exit Group") },
            text = { Text("Are you sure you want to exit \"$groupName\"?") },
            confirmButton = {
                TextButton(onClick = {
                    Toast.makeText(context, "Left group", Toast.LENGTH_SHORT).show()
                    showExitGroupConfirm = false
                    onBack()
                }) { Text("Exit", color = Color.Red) }
            },
            dismissButton = { TextButton(onClick = { showExitGroupConfirm = false }) { Text("Cancel") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Group Info") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1A56DB),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                ),
                actions = {
                    IconButton(onClick = { }) { Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Color.White) }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(paddingValues)
        ) {
            // Group header
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Surface(modifier = Modifier.size(80.dp).clip(CircleShape), color = Color(0xFF4CAF50)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Group, contentDescription = null, tint = Color.White, modifier = Modifier.size(40.dp))
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = groupName, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    Text(text = "Group \u00B7 ${members.size} participants", color = Color.Gray, fontSize = 14.sp)
                }
            }

            // Description
            item {
                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                    Text("Description", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(4.dp))
                    if (isEditingDescription) {
                        OutlinedTextField(
                            value = groupDescription,
                            onValueChange = { groupDescription = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Add group description") },
                            trailingIcon = {
                                IconButton(onClick = {
                                    isEditingDescription = false
                                    Toast.makeText(context, "Description updated", Toast.LENGTH_SHORT).show()
                                }) { Icon(Icons.Default.Check, contentDescription = "Save", tint = Color(0xFF246BFD)) }
                            }
                        )
                    } else {
                        Text(
                            text = groupDescription.ifBlank { "Add group description" },
                            color = if (groupDescription.isBlank()) Color.Gray else Color.Black,
                            modifier = Modifier.clickable { isEditingDescription = true }
                        )
                    }
                }
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }

            // Quick actions
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable { onAddMembers() }) {
                        Surface(shape = CircleShape, color = Color(0xFF246BFD).copy(alpha = 0.1f), modifier = Modifier.size(48.dp)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.PersonAdd, contentDescription = null, tint = Color(0xFF246BFD)) }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Add", fontSize = 12.sp, color = Color(0xFF246BFD))
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable { showShareLinkDialog = true }) {
                        Surface(shape = CircleShape, color = Color(0xFF246BFD).copy(alpha = 0.1f), modifier = Modifier.size(48.dp)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Link, contentDescription = null, tint = Color(0xFF246BFD)) }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Invite Link", fontSize = 12.sp, color = Color(0xFF246BFD))
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable {
                        Toast.makeText(context, "Notifications muted", Toast.LENGTH_SHORT).show()
                    }) {
                        Surface(shape = CircleShape, color = Color(0xFF246BFD).copy(alpha = 0.1f), modifier = Modifier.size(48.dp)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.VolumeOff, contentDescription = null, tint = Color(0xFF246BFD)) }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Mute", fontSize = 12.sp, color = Color(0xFF246BFD))
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable {
                        Toast.makeText(context, "Search in chat", Toast.LENGTH_SHORT).show()
                    }) {
                        Surface(shape = CircleShape, color = Color(0xFF246BFD).copy(alpha = 0.1f), modifier = Modifier.size(48.dp)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF246BFD)) }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Search", fontSize = 12.sp, color = Color(0xFF246BFD))
                    }
                }
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }

            // Media, links, docs
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { }.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Media, Links, and Docs", fontWeight = FontWeight.Medium)
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.Gray)
                }
                Divider()
            }

            // Members header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("${members.size} Participants", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color.Gray)
                    Icon(Icons.Default.Search, contentDescription = "Search members", tint = Color.Gray, modifier = Modifier.size(20.dp))
                }
            }

            // Add participant
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { onAddMembers() }.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(modifier = Modifier.size(40.dp), shape = CircleShape, color = Color(0xFF246BFD)) {
                        Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.PersonAdd, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp)) }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Add Participants", color = Color(0xFF246BFD), fontWeight = FontWeight.Medium)
                }
            }

            // Invite via link
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showShareLinkDialog = true }.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(modifier = Modifier.size(40.dp), shape = CircleShape, color = Color(0xFF246BFD)) {
                        Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Link, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp)) }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Invite via Link", color = Color(0xFF246BFD), fontWeight = FontWeight.Medium)
                }
            }

            // Members list
            items(members) { member ->
                var showMemberMenu by remember { mutableStateOf(false) }
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { if (member.id != "1") showMemberMenu = true }.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(modifier = Modifier.size(40.dp).clip(CircleShape), color = Color(0xFF246BFD)) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(text = member.name.firstOrNull()?.toString() ?: "?", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = if (member.id == "1") "${member.name} (You)" else member.name, fontWeight = FontWeight.Medium)
                        if (member.phoneNumber.isNotBlank()) {
                            Text(member.phoneNumber, fontSize = 12.sp, color = Color.Gray)
                        }
                    }
                    if (member.role == "admin") {
                        Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF246BFD).copy(alpha = 0.1f)) {
                            Text("Admin", fontSize = 11.sp, color = Color(0xFF246BFD), fontWeight = FontWeight.Medium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                        }
                    }
                    if (showMemberMenu && member.id != "1") {
                        DropdownMenu(expanded = showMemberMenu, onDismissRequest = { showMemberMenu = false }) {
                            DropdownMenuItem(
                                text = { Text("Message ${member.name}") },
                                onClick = { showMemberMenu = false; onChatClick(member.id) },
                                leadingIcon = { Icon(Icons.Default.Message, contentDescription = null) }
                            )
                            DropdownMenuItem(
                                text = { Text("Change Role") },
                                onClick = { showMemberMenu = false; showRoleDialog = member },
                                leadingIcon = { Icon(Icons.Default.AdminPanelSettings, contentDescription = null) }
                            )
                            DropdownMenuItem(
                                text = { Text("Remove from Group") },
                                onClick = { showMemberMenu = false; showRemoveConfirm = member },
                                leadingIcon = { Icon(Icons.Default.RemoveCircle, contentDescription = null, tint = Color.Red) }
                            )
                        }
                    }
                }
                Divider(modifier = Modifier.padding(start = 68.dp))
            }

            // Exit group & Report
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Divider()
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showExitGroupConfirm = true }.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.Red)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Exit Group", color = Color.Red, fontWeight = FontWeight.Medium)
                }
                Row(
                    modifier = Modifier.fillMaxWidth().clickable {
                        Toast.makeText(context, "Group reported", Toast.LENGTH_SHORT).show()
                    }.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.ThumbDown, contentDescription = null, tint = Color.Red)
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Report Group", color = Color.Red, fontWeight = FontWeight.Medium)
                }
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
