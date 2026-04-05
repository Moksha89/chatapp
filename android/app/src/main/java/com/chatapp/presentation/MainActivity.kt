package com.chatapp.presentation

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.chatapp.BuildConfig
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.AndroidVersion
import com.chatapp.presentation.common.theme.AbhiTheme
import com.chatapp.presentation.navigation.AppNavigation
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    @Inject
    lateinit var apiService: ApiService
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AbhiTheme {
                var showUpdateDialog by remember { mutableStateOf(false) }
                var updateInfo by remember { mutableStateOf<AndroidVersion?>(null) }
                var forceUpdate by remember { mutableStateOf(false) }
                
                LaunchedEffect(Unit) {
                    try {
                        val versionResponse = withContext(Dispatchers.IO) {
                            apiService.checkVersion()
                        }
                        val androidVersion = versionResponse.android
                        val currentVersionCode = BuildConfig.VERSION_CODE
                        
                        if (androidVersion.versionCode > currentVersionCode) {
                            updateInfo = androidVersion
                            forceUpdate = currentVersionCode < androidVersion.minVersionCode
                            showUpdateDialog = true
                        }
                    } catch (e: Exception) {
                        // Silently fail - don't block app usage if version check fails
                        e.printStackTrace()
                    }
                }
                
                // Request permissions on startup
                RequestPermissions()
                
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                    
                    if (showUpdateDialog && updateInfo != null) {
                        UpdateDialog(
                            versionInfo = updateInfo!!,
                            forceUpdate = forceUpdate,
                            onUpdate = {
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(updateInfo!!.downloadUrl))
                                startActivity(intent)
                                if (forceUpdate) {
                                    finish()
                                }
                            },
                            onDismiss = {
                                if (!forceUpdate) {
                                    showUpdateDialog = false
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun RequestPermissions() {
    val context = LocalContext.current
    var permissionsRequested by remember { mutableStateOf(false) }
    
    val permissions = remember {
        buildList {
            add(Manifest.permission.CAMERA)
            add(Manifest.permission.RECORD_AUDIO)
            add(Manifest.permission.READ_CONTACTS)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.READ_MEDIA_IMAGES)
                add(Manifest.permission.READ_MEDIA_VIDEO)
                add(Manifest.permission.READ_MEDIA_AUDIO)
                add(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }.toTypedArray()
    }
    
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissionsMap ->
        // Handle permission results - app continues regardless of results
        permissionsMap.forEach { (permission, isGranted) ->
            if (!isGranted) {
                println("Permission denied: $permission")
            }
        }
    }
    
    LaunchedEffect(Unit) {
        if (!permissionsRequested) {
            permissionsRequested = true
            val permissionsToRequest = permissions.filter { permission ->
                ContextCompat.checkSelfPermission(context, permission) != PackageManager.PERMISSION_GRANTED
            }.toTypedArray()
            
            if (permissionsToRequest.isNotEmpty()) {
                permissionLauncher.launch(permissionsToRequest)
            }
        }
    }
}

@Composable
fun UpdateDialog(
    versionInfo: AndroidVersion,
    forceUpdate: Boolean,
    onUpdate: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = { if (!forceUpdate) onDismiss() },
        title = {
            Text(
                text = if (forceUpdate) "Update Required" else "Update Available"
            )
        },
        text = {
            Text(
                text = buildString {
                    append("A new version (${versionInfo.versionName}) is available.\n\n")
                    append("What's new:\n${versionInfo.releaseNotes}")
                    if (forceUpdate) {
                        append("\n\nThis update is required to continue using the app.")
                    }
                }
            )
        },
        confirmButton = {
            TextButton(onClick = onUpdate) {
                Text("Update Now")
            }
        },
        dismissButton = {
            if (!forceUpdate) {
                TextButton(onClick = onDismiss) {
                    Text("Later")
                }
            }
        }
    )
}
