package com.chatapp.presentation.qr

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.zxing.integration.android.IntentIntegrator
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QrScannerScreen(
    onBack: () -> Unit,
    onPairingCodeScanned: (String) -> Unit,
    onConfirmPairing: suspend (String) -> Result<Boolean>,
    isLoading: Boolean = false,
    errorMessage: String? = null
) {
    val context = LocalContext.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    var scannedCode by remember { mutableStateOf<String?>(null) }
    var isPairing by remember { mutableStateOf(false) }
    var pairingError by remember { mutableStateOf<String?>(null) }
    var pairingSuccess by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }

    val scanLauncher = rememberLauncherForActivityResult(
        contract = ScanContract()
    ) { result ->
        if (result.contents != null) {
            try {
                val json = JSONObject(result.contents)
                // Try both 'code' (web format) and 'pairingCode' (legacy format)
                var pairingCode = json.optString("code", "")
                if (pairingCode.isEmpty()) {
                    pairingCode = json.optString("pairingCode", "")
                }
                // Verify it's from our app
                val type = json.optString("type", "")
                if (type == "chatapp-pairing" && pairingCode.isNotEmpty()) {
                    scannedCode = pairingCode
                    onPairingCodeScanned(pairingCode)
                } else if (pairingCode.isNotEmpty()) {
                    // Accept if we have a code even without type check (backwards compatibility)
                    scannedCode = pairingCode
                    onPairingCodeScanned(pairingCode)
                } else {
                    pairingError = "Invalid QR code. Open http://173.208.132.8 and click 'Login with QR Code'"
                }
            } catch (e: Exception) {
                // If not JSON, check if it's a raw pairing code (8 chars alphanumeric)
                val raw = result.contents.trim()
                if (raw.length == 8 && raw.matches(Regex("^[A-Za-z0-9]+$"))) {
                    scannedCode = raw
                    onPairingCodeScanned(raw)
                } else {
                    pairingError = "Invalid QR code. Make sure you're scanning from http://173.208.132.8"
                }
            }
        }
    }

    LaunchedEffect(scannedCode) {
        scannedCode?.let { code ->
            isPairing = true
            pairingError = null
            val result = onConfirmPairing(code)
            isPairing = false
            result.fold(
                onSuccess = { success ->
                    if (success) {
                        pairingSuccess = true
                    } else {
                        pairingError = "Pairing failed"
                    }
                },
                onFailure = { error ->
                    pairingError = error.message ?: "Pairing failed"
                }
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Link Web Device") },
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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (pairingSuccess) {
                Icon(
                    imageVector = Icons.Default.QrCodeScanner,
                    contentDescription = null,
                    modifier = Modifier.size(80.dp),
                    tint = Color(0xFF246BFD)
                )
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "Device Linked Successfully!",
                    style = MaterialTheme.typography.headlineSmall,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "The web device is now connected to your account.",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = Color.Gray
                )
                Spacer(modifier = Modifier.height(32.dp))
                Button(
                    onClick = onBack,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A56DB))
                ) {
                    Text("Done")
                }
            } else if (isPairing || isLoading) {
                CircularProgressIndicator(color = Color(0xFF1A56DB))
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Linking device...",
                    style = MaterialTheme.typography.bodyMedium
                )
            } else {
                Icon(
                    imageVector = Icons.Default.QrCodeScanner,
                    contentDescription = null,
                    modifier = Modifier.size(80.dp),
                    tint = Color(0xFF1A56DB)
                )
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    text = "Scan QR Code",
                    style = MaterialTheme.typography.headlineSmall,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Open http://173.208.132.8 on your computer, click 'Login with QR Code', and scan the QR code to link your device.",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = Color.Gray
                )
                Spacer(modifier = Modifier.height(32.dp))

                if (pairingError != null || errorMessage != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = pairingError ?: errorMessage ?: "",
                            color = Color(0xFFB71C1C),
                            modifier = Modifier.padding(16.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                Button(
                    onClick = {
                        if (hasCameraPermission) {
                            pairingError = null
                            scannedCode = null
                            val options = ScanOptions()
                                .setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                                .setPrompt("Scan the QR code from ChatApp Web")
                                .setBeepEnabled(true)
                                .setOrientationLocked(true)
                            scanLauncher.launch(options)
                        } else {
                            permissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A56DB)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.QrCodeScanner, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (hasCameraPermission) "Scan QR Code" else "Grant Camera Permission")
                }
            }
        }
    }
}
