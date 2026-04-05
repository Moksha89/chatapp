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
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    // Navigate to chat list when logged in
    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) {
            onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF1A56DB),
                        Color(0xFF246BFD)
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
                    tint = Color(0xFF246BFD)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Abhi",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = when (uiState.step) {
                        AuthStep.PHONE -> "Enter your phone number to get started"
                        AuthStep.OTP -> "Enter the verification code sent to your phone"
                        AuthStep.REGISTER -> "Create your account"
                    },
                    color = Color.Gray
                )

                Spacer(modifier = Modifier.height(24.dp))

                uiState.error?.let { errorMsg ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = errorMsg,
                            color = Color(0xFFD32F2F),
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }

                when (uiState.step) {
                    AuthStep.PHONE -> {
                        OutlinedTextField(
                            value = uiState.phoneNumber,
                            onValueChange = { viewModel.updatePhoneNumber(it) },
                            label = { Text("Phone Number") },
                            placeholder = { Text("+1234567890") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = { viewModel.sendOtp() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF246BFD)),
                            enabled = !uiState.isLoading && uiState.phoneNumber.isNotBlank()
                        ) {
                            if (uiState.isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }
                            Text(if (uiState.isLoading) "Sending..." else "Send OTP")
                        }
                    }

                    AuthStep.OTP -> {
                        OutlinedTextField(
                            value = uiState.otp,
                            onValueChange = { if (it.length <= 6) viewModel.updateOtp(it) },
                            label = { Text("Verification Code") },
                            placeholder = { Text("Enter 6-digit code") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = { viewModel.verifyOtp() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF246BFD)),
                            enabled = !uiState.isLoading && uiState.otp.length == 6
                        ) {
                            if (uiState.isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }
                            Text(if (uiState.isLoading) "Verifying..." else "Verify")
                        }

                        TextButton(onClick = { viewModel.goBack() }) {
                            Text("Change Phone Number")
                        }
                    }

                    AuthStep.REGISTER -> {
                        OutlinedTextField(
                            value = uiState.displayName,
                            onValueChange = { viewModel.updateDisplayName(it) },
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
                                checked = uiState.isBusiness,
                                onCheckedChange = { viewModel.updateIsBusiness(it) }
                            )
                            Text("This is a business account")
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = { viewModel.register() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF246BFD)),
                            enabled = !uiState.isLoading && uiState.displayName.isNotBlank()
                        ) {
                            if (uiState.isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                            }
                            Text(if (uiState.isLoading) "Creating Account..." else "Create Account")
                        }
                        
                        TextButton(onClick = { viewModel.goBack() }) {
                            Text("Back")
                        }
                    }
                }
            }
        }
    }
}
