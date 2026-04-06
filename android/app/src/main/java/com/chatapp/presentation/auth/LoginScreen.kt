package com.chatapp.presentation.auth

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel

data class Country(
    val name: String,
    val code: String,
    val dialCode: String,
    val flag: String
)

private val countries = listOf(
    Country("India", "IN", "+91", "\uD83C\uDDEE\uD83C\uDDF3"),
    Country("United States", "US", "+1", "\uD83C\uDDFA\uD83C\uDDF8"),
    Country("United Kingdom", "GB", "+44", "\uD83C\uDDEC\uD83C\uDDE7"),
    Country("Canada", "CA", "+1", "\uD83C\uDDE8\uD83C\uDDE6"),
    Country("Australia", "AU", "+61", "\uD83C\uDDE6\uD83C\uDDFA"),
    Country("Germany", "DE", "+49", "\uD83C\uDDE9\uD83C\uDDEA"),
    Country("France", "FR", "+33", "\uD83C\uDDEB\uD83C\uDDF7"),
    Country("Japan", "JP", "+81", "\uD83C\uDDEF\uD83C\uDDF5"),
    Country("China", "CN", "+86", "\uD83C\uDDE8\uD83C\uDDF3"),
    Country("Brazil", "BR", "+55", "\uD83C\uDDE7\uD83C\uDDF7"),
    Country("Mexico", "MX", "+52", "\uD83C\uDDF2\uD83C\uDDFD"),
    Country("South Korea", "KR", "+82", "\uD83C\uDDF0\uD83C\uDDF7"),
    Country("Italy", "IT", "+39", "\uD83C\uDDEE\uD83C\uDDF9"),
    Country("Spain", "ES", "+34", "\uD83C\uDDEA\uD83C\uDDF8"),
    Country("Russia", "RU", "+7", "\uD83C\uDDF7\uD83C\uDDFA"),
    Country("Indonesia", "ID", "+62", "\uD83C\uDDEE\uD83C\uDDE9"),
    Country("Turkey", "TR", "+90", "\uD83C\uDDF9\uD83C\uDDF7"),
    Country("Saudi Arabia", "SA", "+966", "\uD83C\uDDF8\uD83C\uDDE6"),
    Country("United Arab Emirates", "AE", "+971", "\uD83C\uDDE6\uD83C\uDDEA"),
    Country("Singapore", "SG", "+65", "\uD83C\uDDF8\uD83C\uDDEC"),
    Country("Malaysia", "MY", "+60", "\uD83C\uDDF2\uD83C\uDDFE"),
    Country("Thailand", "TH", "+66", "\uD83C\uDDF9\uD83C\uDDED"),
    Country("Philippines", "PH", "+63", "\uD83C\uDDF5\uD83C\uDDED"),
    Country("Nigeria", "NG", "+234", "\uD83C\uDDF3\uD83C\uDDEC"),
    Country("South Africa", "ZA", "+27", "\uD83C\uDDFF\uD83C\uDDE6"),
    Country("Egypt", "EG", "+20", "\uD83C\uDDEA\uD83C\uDDEC"),
    Country("Pakistan", "PK", "+92", "\uD83C\uDDF5\uD83C\uDDF0"),
    Country("Bangladesh", "BD", "+880", "\uD83C\uDDE7\uD83C\uDDE9"),
    Country("Sri Lanka", "LK", "+94", "\uD83C\uDDF1\uD83C\uDDF0"),
    Country("Nepal", "NP", "+977", "\uD83C\uDDF3\uD83C\uDDF5")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) {
            onLoginSuccess()
        }
    }

    var selectedCountry by remember { mutableStateOf(countries[0]) }
    var localPhone by remember { mutableStateOf("") }
    var showCountryPicker by remember { mutableStateOf(false) }
    var acceptedTerms by remember { mutableStateOf(false) }
    var profilePhotoUri by remember { mutableStateOf<Uri?>(null) }

    val photoLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        profilePhotoUri = uri
    }

    if (showCountryPicker) {
        CountryPickerDialog(
            countries = countries,
            onDismiss = { showCountryPicker = false },
            onSelect = { country ->
                selectedCountry = country
                showCountryPicker = false
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when (uiState.step) {
                            AuthStep.PHONE -> "Login"
                            AuthStep.OTP -> "Login"
                            AuthStep.REGISTER -> "Register"
                        },
                        fontWeight = FontWeight.SemiBold
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF246BFD),
                    titleContentColor = Color.White
                ),
                navigationIcon = {
                    if (uiState.step != AuthStep.PHONE) {
                        IconButton(onClick = { viewModel.goBack() }) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
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
                .background(Color.White)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            when (uiState.step) {
                AuthStep.PHONE -> {
                    PhoneInputStep(
                        phoneNumber = localPhone,
                        onPhoneChange = { localPhone = it },
                        selectedCountry = selectedCountry,
                        onCountryClick = { showCountryPicker = true },
                        acceptedTerms = acceptedTerms,
                        onTermsChange = { acceptedTerms = it },
                        isLoading = uiState.isLoading,
                        error = uiState.error,
                        onSendOtp = {
                            val fullPhone = selectedCountry.dialCode + localPhone
                            viewModel.updatePhoneNumber(fullPhone)
                            viewModel.sendOtp()
                        }
                    )
                }

                AuthStep.OTP -> {
                    OtpInputStep(
                        otp = uiState.otp,
                        onOtpChange = { if (it.length <= 6) viewModel.updateOtp(it) },
                        phoneNumber = uiState.phoneNumber,
                        isLoading = uiState.isLoading,
                        error = uiState.error,
                        onVerify = { viewModel.verifyOtp() },
                        onResend = { viewModel.sendOtp() },
                        onChangeNumber = { viewModel.goBack() }
                    )
                }

                AuthStep.REGISTER -> {
                    RegisterStep(
                        displayName = uiState.displayName,
                        onNameChange = { viewModel.updateDisplayName(it) },
                        isBusiness = uiState.isBusiness,
                        onBusinessChange = { viewModel.updateIsBusiness(it) },
                        profilePhotoUri = profilePhotoUri,
                        onPickPhoto = { photoLauncher.launch("image/*") },
                        isLoading = uiState.isLoading,
                        error = uiState.error,
                        onRegister = { viewModel.register() }
                    )
                }
            }
        }
    }
}

@Composable
private fun PhoneInputStep(
    phoneNumber: String,
    onPhoneChange: (String) -> Unit,
    selectedCountry: Country,
    onCountryClick: () -> Unit,
    acceptedTerms: Boolean,
    onTermsChange: (Boolean) -> Unit,
    isLoading: Boolean,
    error: String?,
    onSendOtp: () -> Unit
) {
    Spacer(modifier = Modifier.height(32.dp))

    Box(
        modifier = Modifier
            .size(120.dp)
            .clip(CircleShape)
            .background(Color(0xFFE8F0FE)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Default.Phone,
            contentDescription = null,
            modifier = Modifier.size(56.dp),
            tint = Color(0xFF246BFD)
        )
    }

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Enter your\nmobile phone",
        fontSize = 22.sp,
        fontWeight = FontWeight.Bold,
        color = Color(0xFF1A1A2E),
        textAlign = TextAlign.Center,
        lineHeight = 28.sp
    )

    Spacer(modifier = Modifier.height(32.dp))

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier
                .clickable { onCountryClick() }
                .height(56.dp),
            shape = RoundedCornerShape(12.dp),
            color = Color(0xFFF7F8FC),
            border = ButtonDefaults.outlinedButtonBorder
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = selectedCountry.flag, fontSize = 20.sp)
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = selectedCountry.dialCode,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF1A1A2E)
                )
                Icon(
                    Icons.Default.ArrowDropDown,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = Color.Gray
                )
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        OutlinedTextField(
            value = phoneNumber,
            onValueChange = { onPhoneChange(it.filter { c -> c.isDigit() }) },
            modifier = Modifier
                .weight(1f)
                .height(56.dp),
            placeholder = { Text("Phone number", color = Color.Gray) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF246BFD),
                unfocusedBorderColor = Color(0xFFE0E0E0),
                focusedContainerColor = Color(0xFFF7F8FC),
                unfocusedContainerColor = Color(0xFFF7F8FC)
            )
        )
    }

    Spacer(modifier = Modifier.height(16.dp))

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onTermsChange(!acceptedTerms) },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = acceptedTerms,
            onCheckedChange = onTermsChange,
            colors = CheckboxDefaults.colors(checkedColor = Color(0xFF246BFD))
        )
        Text(text = "I accept to Conditions", fontSize = 14.sp, color = Color.Gray)
    }

    error?.let {
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = it, color = Color(0xFFD32F2F), fontSize = 13.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))

    Button(
        onClick = onSendOtp,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF246BFD)),
        shape = RoundedCornerShape(16.dp),
        enabled = !isLoading && phoneNumber.isNotBlank() && acceptedTerms
    ) {
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text("Send OTP", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun OtpInputStep(
    otp: String,
    onOtpChange: (String) -> Unit,
    phoneNumber: String,
    isLoading: Boolean,
    error: String?,
    onVerify: () -> Unit,
    onResend: () -> Unit,
    onChangeNumber: () -> Unit
) {
    Spacer(modifier = Modifier.height(32.dp))

    Box(
        modifier = Modifier
            .size(120.dp)
            .clip(CircleShape)
            .background(Color(0xFFE8F0FE)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Default.Lock,
            contentDescription = null,
            modifier = Modifier.size(56.dp),
            tint = Color(0xFF246BFD)
        )
    }

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Enter OTP Code",
        fontSize = 22.sp,
        fontWeight = FontWeight.Bold,
        color = Color(0xFF1A1A2E)
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = "Code sent to $phoneNumber",
        fontSize = 14.sp,
        color = Color.Gray,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(32.dp))

    OtpInputRow(otpValue = otp, onOtpChange = onOtpChange, otpLength = 6)

    error?.let {
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = it, color = Color(0xFFD32F2F), fontSize = 13.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))

    Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
        Text("Didn't receive code? ", fontSize = 14.sp, color = Color.Gray)
        Text(
            text = "Resend",
            fontSize = 14.sp,
            color = Color(0xFF246BFD),
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.clickable { onResend() }
        )
    }

    Spacer(modifier = Modifier.height(24.dp))

    Button(
        onClick = onVerify,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF246BFD)),
        shape = RoundedCornerShape(16.dp),
        enabled = !isLoading && otp.length == 6
    ) {
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text("Verify", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }

    Spacer(modifier = Modifier.height(12.dp))

    TextButton(onClick = onChangeNumber) {
        Text("Change Phone Number", color = Color(0xFF246BFD))
    }
}

@Composable
private fun OtpInputRow(
    otpValue: String,
    onOtpChange: (String) -> Unit,
    otpLength: Int = 6
) {
    val focusManager = LocalFocusManager.current

    BasicTextField(
        value = otpValue,
        onValueChange = { newValue ->
            if (newValue.length <= otpLength && newValue.all { it.isDigit() }) {
                onOtpChange(newValue)
                if (newValue.length == otpLength) {
                    focusManager.clearFocus()
                }
            }
        },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        decorationBox = {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(otpLength) { index ->
                    val char = otpValue.getOrNull(index)
                    val isFocused = otpValue.length == index
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp)
                            .border(
                                width = if (isFocused) 2.dp else 1.dp,
                                color = if (isFocused) Color(0xFF246BFD)
                                else if (char != null) Color(0xFF246BFD).copy(alpha = 0.5f)
                                else Color(0xFFE0E0E0),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .background(Color(0xFFF7F8FC), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = char?.toString() ?: "",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF1A1A2E),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        },
        cursorBrush = SolidColor(Color(0xFF246BFD))
    )
}

@Composable
private fun RegisterStep(
    displayName: String,
    onNameChange: (String) -> Unit,
    isBusiness: Boolean,
    onBusinessChange: (Boolean) -> Unit,
    profilePhotoUri: Uri?,
    onPickPhoto: () -> Unit,
    isLoading: Boolean,
    error: String?,
    onRegister: () -> Unit
) {
    Spacer(modifier = Modifier.height(32.dp))

    Box(
        modifier = Modifier
            .size(120.dp)
            .clip(CircleShape)
            .background(Color(0xFFE8F0FE))
            .clickable { onPickPhoto() },
        contentAlignment = Alignment.Center
    ) {
        if (profilePhotoUri != null) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = Color(0xFF246BFD)
            )
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF4CAF50)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
            }
        } else {
            Icon(
                imageVector = Icons.Default.CameraAlt,
                contentDescription = "Pick photo",
                modifier = Modifier.size(48.dp),
                tint = Color(0xFF246BFD)
            )
        }
    }

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = "Add Profile Photo",
        fontSize = 14.sp,
        color = Color(0xFF246BFD),
        fontWeight = FontWeight.Medium,
        modifier = Modifier.clickable { onPickPhoto() }
    )

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Enter your name",
        fontSize = 22.sp,
        fontWeight = FontWeight.Bold,
        color = Color(0xFF1A1A2E)
    )

    Spacer(modifier = Modifier.height(24.dp))

    OutlinedTextField(
        value = displayName,
        onValueChange = onNameChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("Your name", color = Color.Gray) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Color(0xFF246BFD),
            unfocusedBorderColor = Color(0xFFE0E0E0),
            focusedContainerColor = Color(0xFFF7F8FC),
            unfocusedContainerColor = Color(0xFFF7F8FC)
        ),
        leadingIcon = {
            Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF246BFD))
        }
    )

    Spacer(modifier = Modifier.height(12.dp))

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onBusinessChange(!isBusiness) },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = isBusiness,
            onCheckedChange = onBusinessChange,
            colors = CheckboxDefaults.colors(checkedColor = Color(0xFF246BFD))
        )
        Text(text = "This is a business account", fontSize = 14.sp, color = Color.Gray)
    }

    error?.let {
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = it, color = Color(0xFFD32F2F), fontSize = 13.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))

    Button(
        onClick = onRegister,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF246BFD)),
        shape = RoundedCornerShape(16.dp),
        enabled = !isLoading && displayName.isNotBlank()
    ) {
        if (isLoading) {
            CircularProgressIndicator(modifier = Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text("Create Account", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CountryPickerDialog(
    countries: List<Country>,
    onDismiss: () -> Unit,
    onSelect: (Country) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    val filteredCountries = if (searchQuery.isBlank()) countries
    else countries.filter {
        it.name.contains(searchQuery, ignoreCase = true) ||
                it.dialCode.contains(searchQuery) ||
                it.code.contains(searchQuery, ignoreCase = true)
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.7f)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Select Country",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Search country...") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray)
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF246BFD),
                        unfocusedBorderColor = Color(0xFFE0E0E0)
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                androidx.compose.foundation.lazy.LazyColumn {
                    items(filteredCountries.size) { index ->
                        val country = filteredCountries[index]
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(country) }
                                .padding(vertical = 12.dp, horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = country.flag, fontSize = 24.sp)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = country.name,
                                modifier = Modifier.weight(1f),
                                fontSize = 15.sp,
                                color = Color(0xFF1A1A2E)
                            )
                            Text(
                                text = country.dialCode,
                                fontSize = 14.sp,
                                color = Color.Gray,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        if (index < filteredCountries.size - 1) {
                            HorizontalDivider(color = Color(0xFFF0F0F0))
                        }
                    }
                }
            }
        }
    }
}
