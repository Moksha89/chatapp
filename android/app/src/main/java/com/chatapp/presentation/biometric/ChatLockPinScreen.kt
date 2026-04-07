package com.chatapp.presentation.biometric

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Chat Lock PIN verification UI.
 * Fallback for when biometric authentication fails or is unavailable.
 * Supports 4-6 digit numeric PIN with show/hide toggle.
 * PIN is stored in encrypted SharedPreferences.
 */

private const val PIN_PREFS_NAME = "chat_lock_pin_prefs"
private const val KEY_PIN = "chat_lock_pin"
private const val KEY_PIN_ENABLED = "pin_lock_enabled"

object ChatLockPinManager {

    private fun getPrefs(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                PIN_PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (_: Exception) {
            // Fallback to regular prefs if encryption not available
            context.getSharedPreferences(PIN_PREFS_NAME, Context.MODE_PRIVATE)
        }
    }

    fun isPinEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_PIN_ENABLED, false)
    }

    fun setPin(context: Context, pin: String) {
        getPrefs(context).edit()
            .putString(KEY_PIN, pin)
            .putBoolean(KEY_PIN_ENABLED, true)
            .apply()
    }

    fun removePin(context: Context) {
        getPrefs(context).edit()
            .remove(KEY_PIN)
            .putBoolean(KEY_PIN_ENABLED, false)
            .apply()
    }

    fun verifyPin(context: Context, pin: String): Boolean {
        val storedPin = getPrefs(context).getString(KEY_PIN, null)
        return storedPin != null && storedPin == pin
    }
}

@Composable
fun ChatLockPinScreen(
    mode: PinScreenMode = PinScreenMode.VERIFY,
    onSuccess: () -> Unit,
    onCancel: () -> Unit
) {
    val context = LocalContext.current
    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var isConfirmStep by remember { mutableStateOf(false) }
    var showPin by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var attempts by remember { mutableIntStateOf(0) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Lock icon
            Icon(
                Icons.Default.Lock,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(24.dp))

            // Title
            Text(
                text = when {
                    mode == PinScreenMode.SET && !isConfirmStep -> "Set Chat Lock PIN"
                    mode == PinScreenMode.SET && isConfirmStep -> "Confirm PIN"
                    mode == PinScreenMode.CHANGE -> "Enter New PIN"
                    else -> "Enter PIN to Unlock"
                },
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = when {
                    mode == PinScreenMode.SET && !isConfirmStep -> "Choose a 4-6 digit PIN"
                    mode == PinScreenMode.SET && isConfirmStep -> "Re-enter your PIN to confirm"
                    else -> "Enter your 4-6 digit PIN"
                },
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(32.dp))

            // PIN dots visualization
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val currentPin = if (isConfirmStep) confirmPin else pin
                for (i in 0 until 6) {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(CircleShape)
                            .background(
                                if (i < currentPin.length) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.outlineVariant
                            )
                            .border(
                                1.dp,
                                if (i < currentPin.length) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.outline,
                                CircleShape
                            )
                    )
                }
            }
            Spacer(modifier = Modifier.height(24.dp))

            // PIN input field
            OutlinedTextField(
                value = if (isConfirmStep) confirmPin else pin,
                onValueChange = { newValue ->
                    if (newValue.length <= 6 && newValue.all { it.isDigit() }) {
                        errorMessage = null
                        if (isConfirmStep) confirmPin = newValue else pin = newValue
                    }
                },
                modifier = Modifier.width(200.dp),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                visualTransformation = if (showPin) VisualTransformation.None else PasswordVisualTransformation(),
                singleLine = true,
                textStyle = LocalTextStyle.current.copy(
                    textAlign = TextAlign.Center,
                    fontSize = 24.sp,
                    letterSpacing = 8.sp
                ),
                trailingIcon = {
                    IconButton(onClick = { showPin = !showPin }) {
                        Icon(
                            if (showPin) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                            contentDescription = if (showPin) "Hide PIN" else "Show PIN"
                        )
                    }
                }
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Error message
            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Action buttons
            Button(
                onClick = {
                    when (mode) {
                        PinScreenMode.SET -> {
                            if (!isConfirmStep) {
                                if (pin.length < 4) {
                                    errorMessage = "PIN must be at least 4 digits"
                                } else {
                                    isConfirmStep = true
                                    errorMessage = null
                                }
                            } else {
                                if (confirmPin == pin) {
                                    ChatLockPinManager.setPin(context, pin)
                                    onSuccess()
                                } else {
                                    errorMessage = "PINs don't match. Try again."
                                    confirmPin = ""
                                }
                            }
                        }
                        PinScreenMode.VERIFY -> {
                            if (ChatLockPinManager.verifyPin(context, pin)) {
                                onSuccess()
                            } else {
                                attempts++
                                errorMessage = "Incorrect PIN. ${3 - attempts} attempts remaining."
                                pin = ""
                                if (attempts >= 3) {
                                    errorMessage = "Too many attempts. Please wait."
                                }
                            }
                        }
                        PinScreenMode.CHANGE -> {
                            if (pin.length < 4) {
                                errorMessage = "PIN must be at least 4 digits"
                            } else if (!isConfirmStep) {
                                isConfirmStep = true
                                errorMessage = null
                            } else {
                                if (confirmPin == pin) {
                                    ChatLockPinManager.setPin(context, pin)
                                    onSuccess()
                                } else {
                                    errorMessage = "PINs don't match. Try again."
                                    confirmPin = ""
                                }
                            }
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                enabled = (if (isConfirmStep) confirmPin.length >= 4 else pin.length >= 4) && attempts < 3,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text(
                    text = when {
                        mode == PinScreenMode.SET && !isConfirmStep -> "Next"
                        mode == PinScreenMode.SET && isConfirmStep -> "Set PIN"
                        mode == PinScreenMode.CHANGE && !isConfirmStep -> "Next"
                        mode == PinScreenMode.CHANGE && isConfirmStep -> "Change PIN"
                        else -> "Unlock"
                    },
                    fontSize = 16.sp
                )
            }
            Spacer(modifier = Modifier.height(12.dp))

            // Cancel button
            TextButton(onClick = onCancel) {
                Text("Cancel", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            // Biometric fallback option (for verify mode)
            if (mode == PinScreenMode.VERIFY) {
                Spacer(modifier = Modifier.height(16.dp))
                TextButton(onClick = onCancel) {
                    Icon(
                        Icons.Default.Fingerprint,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Use biometric instead", color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

enum class PinScreenMode {
    SET,
    VERIFY,
    CHANGE
}
