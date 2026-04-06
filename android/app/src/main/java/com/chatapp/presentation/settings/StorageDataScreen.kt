package com.chatapp.presentation.settings

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StorageDataScreen(
    onBack: () -> Unit
) {
    var autoDownloadImages by remember { mutableStateOf(true) }
    var autoDownloadAudio by remember { mutableStateOf(true) }
    var autoDownloadVideo by remember { mutableStateOf(false) }
    var autoDownloadDocuments by remember { mutableStateOf(true) }
    var useLessDataForCalls by remember { mutableStateOf(false) }
    var showClearCacheDialog by remember { mutableStateOf(false) }

    if (showClearCacheDialog) {
        AlertDialog(
            onDismissRequest = { showClearCacheDialog = false },
            title = { Text("Clear Cache") },
            text = { Text("This will clear cached media and temporary files. Your messages and chats will not be affected.") },
            confirmButton = {
                TextButton(onClick = { showClearCacheDialog = false }) {
                    Text("Clear", color = MaterialTheme.colorScheme.primary)
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearCacheDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Storage and Data") },
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Auto-Download Section
            item {
                Text(
                    text = "Auto-Download Media",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 8.dp)
                )
            }

            item {
                StorageToggle(
                    icon = Icons.Default.Image,
                    title = "Images",
                    subtitle = "Automatically download images",
                    checked = autoDownloadImages,
                    onCheckedChange = { autoDownloadImages = it }
                )
            }

            item {
                StorageToggle(
                    icon = Icons.Default.AudioFile,
                    title = "Audio",
                    subtitle = "Automatically download audio messages",
                    checked = autoDownloadAudio,
                    onCheckedChange = { autoDownloadAudio = it }
                )
            }

            item {
                StorageToggle(
                    icon = Icons.Default.Videocam,
                    title = "Video",
                    subtitle = "Automatically download videos",
                    checked = autoDownloadVideo,
                    onCheckedChange = { autoDownloadVideo = it }
                )
            }

            item {
                StorageToggle(
                    icon = Icons.Default.InsertDriveFile,
                    title = "Documents",
                    subtitle = "Automatically download documents",
                    checked = autoDownloadDocuments,
                    onCheckedChange = { autoDownloadDocuments = it }
                )
            }

            item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }

            // Network Usage
            item {
                Text(
                    text = "Network Usage",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                )
            }

            item {
                StorageToggle(
                    icon = Icons.Default.DataUsage,
                    title = "Use Less Data for Calls",
                    subtitle = "Reduce data usage during voice and video calls",
                    checked = useLessDataForCalls,
                    onCheckedChange = { useLessDataForCalls = it }
                )
            }

            item { Divider(modifier = Modifier.padding(vertical = 8.dp)) }

            // Storage Management
            item {
                Text(
                    text = "Storage",
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp)
                )
            }

            item {
                StorageActionItem(
                    icon = Icons.Default.CleaningServices,
                    title = "Clear Cache",
                    subtitle = "Free up space by clearing cached files",
                    onClick = { showClearCacheDialog = true }
                )
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Media auto-download settings apply when using mobile data or Wi-Fi.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun StorageToggle(
    icon: ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
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
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = MaterialTheme.colorScheme.primary
            )
        )
    }
}

@Composable
fun StorageActionItem(
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
            tint = MaterialTheme.colorScheme.primary,
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
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Icon(
            Icons.Default.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
