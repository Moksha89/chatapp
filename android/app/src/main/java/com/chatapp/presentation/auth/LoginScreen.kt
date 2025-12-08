package com.chatapp.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Message
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit
) {
    var step by remember { mutableStateOf(LoginStep.PHONE) }
    var phoneNumber by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var isBusiness by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var devOtp by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF128C7E),
                        Color(0xFF075E54)
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Default.Message,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = Color(0xFF25D366)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "WhatsApp Business Chat",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = when (step) {
                        LoginStep.PHONE -> "Enter your phone number to get started"
                        LoginStep.OTP -> "Enter the verification code"
                        LoginStep.REGISTER -> "Create your account"
                    },
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(24.dp))

                error?.let {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = it,
                            color = Color(0xFFD32F2F),
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                devOtp?.let {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Development OTP: $it",
                            color = Color(0xFF1976D2),
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                when (step) {
                    LoginStep.PHONE -> {
                        OutlinedTextField(
                            value = phoneNumber,
                            onValueChange = { phoneNumber = it },
                            label = { Text("Phone Number") },
                            placeholder = { Text("+1234567890") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = {
                                devOtp = "123456"
                                step = LoginStep.OTP
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                            enabled = !isLoading && phoneNumber.isNotBlank()
                        ) {
                            Text(if (isLoading) "Sending..." else "Send OTP")
                        }
                    }

                    LoginStep.OTP -> {
                        OutlinedTextField(
                            value = otp,
                            onValueChange = { if (it.length <= 6) otp = it },
                            label = { Text("Verification Code") },
                            placeholder = { Text("Enter 6-digit code") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = {
                                step = LoginStep.REGISTER
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                            enabled = !isLoading && otp.length == 6
                        ) {
                            Text(if (isLoading) "Verifying..." else "Verify")
                        }

                        TextButton(
                            onClick = {
                                step = LoginStep.PHONE
                                otp = ""
                                devOtp = null
                            }
                        ) {
                            Text("Change Phone Number")
                        }
                    }

                    LoginStep.REGISTER -> {
                        OutlinedTextField(
                            value = displayName,
                            onValueChange = { displayName = it },
                            label = { Text("Display Name") },
                            placeholder = { Text("Your name") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Checkbox(
                                checked = isBusiness,
                                onCheckedChange = { isBusiness = it }
                            )
                            Text("This is a business account")
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = { onLoginSuccess() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF25D366)),
                            enabled = !isLoading && displayName.isNotBlank()
                        ) {
                            Text(if (isLoading) "Creating Account..." else "Create Account")
                        }
                    }
                }
            }
        }
    }
}

enum class LoginStep {
    PHONE,
    OTP,
    REGISTER
}
