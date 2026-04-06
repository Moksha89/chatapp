package com.chatapp.presentation.auth

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
        if (uiState.isLoggedIn) onLoginSuccess()
    }

    var selectedCountry by remember { mutableStateOf(countries[0]) }
    var localPhone by remember { mutableStateOf("") }
    var showCountryPicker by remember { mutableStateOf(false) }
    var acceptedTerms by remember { mutableStateOf(false) }
    var profilePhotoUri by remember { mutableStateOf<Uri?>(null) }

    val photoLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri: Uri? -> profilePhotoUri = uri }

    if (showCountryPicker) {
        CountryPickerDialog(
            countries = countries,
            onDismiss = { showCountryPicker = false },
            onSelect = { selectedCountry = it; showCountryPicker = false }
        )
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top header bar
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 4.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (uiState.step != AuthStep.PHONE) {
                        IconButton(onClick = { viewModel.goBack() }) {
                            Icon(Icons.Default.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onPrimary)
                        }
                    } else {
                        Spacer(modifier = Modifier.width(48.dp))
                    }
                    Text(
                        text = when (uiState.step) {
                            AuthStep.PHONE -> "Enter your phone number"
                            AuthStep.OTP -> "Verify your number"
                            AuthStep.REGISTER -> "Profile info"
                        },
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.width(48.dp))
                }
            }

            // Content
            Column(
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                when (uiState.step) {
                    AuthStep.PHONE -> PhoneInputStep(
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
                    AuthStep.OTP -> OtpInputStep(
                        otp = uiState.otp,
                        onOtpChange = { if (it.length <= 6) viewModel.updateOtp(it) },
                        phoneNumber = uiState.phoneNumber,
                        isLoading = uiState.isLoading,
                        error = uiState.error,
                        onVerify = { viewModel.verifyOtp() },
                        onResend = { viewModel.sendOtp() },
                        onChangeNumber = { viewModel.goBack() }
                    )
                    AuthStep.REGISTER -> RegisterStep(
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

// ── Phone Step ──────────────────────────────────────────────────────
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
    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Abhi will need to verify your phone number. " +
               "Carrier charges may apply.",
        fontSize = 14.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        lineHeight = 20.sp
    )

    Spacer(modifier = Modifier.height(24.dp))

    // Country selector
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCountryClick() },
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = selectedCountry.flag, fontSize = 22.sp)
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = selectedCountry.name,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
            Icon(
                Icons.Default.ArrowDropDown,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }

    Spacer(modifier = Modifier.height(12.dp))

    // Phone input row
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ) {
            Text(
                text = selectedCountry.dialCode,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        OutlinedTextField(
            value = phoneNumber,
            onValueChange = { onPhoneChange(it.filter { c -> c.isDigit() }) },
            modifier = Modifier.weight(1f),
            placeholder = { Text("Phone number") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            singleLine = true,
            shape = RoundedCornerShape(8.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
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
            colors = CheckboxDefaults.colors(checkedColor = MaterialTheme.colorScheme.primary)
        )
        Text(
            text = "I agree to the Terms of Service and Privacy Policy",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    error?.let {
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))

    Button(
        onClick = onSendOtp,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
        shape = RoundedCornerShape(28.dp),
        enabled = !isLoading && phoneNumber.isNotBlank() && acceptedTerms
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp
            )
        } else {
            Text("Next", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

// ── OTP Step ────────────────────────────────────────────────────────
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
    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Waiting to automatically detect an SMS\nsent to $phoneNumber.",
        fontSize = 14.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        lineHeight = 20.sp
    )

    TextButton(onClick = onChangeNumber) {
        Text("Wrong number?", color = MaterialTheme.colorScheme.primary, fontSize = 14.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))

    OtpInputRow(otpValue = otp, onOtpChange = onOtpChange, otpLength = 6)

    error?.let {
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))

    Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
        Text("Didn't receive code? ", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            text = "Resend",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.clickable { onResend() }
        )
    }

    Spacer(modifier = Modifier.height(32.dp))

    Button(
        onClick = onVerify,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
        shape = RoundedCornerShape(28.dp),
        enabled = !isLoading && otp.length == 6
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp
            )
        } else {
            Text("Verify", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

// ── OTP Input Row ───────────────────────────────────────────────────
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
                if (newValue.length == otpLength) focusManager.clearFocus()
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
                                color = when {
                                    isFocused -> MaterialTheme.colorScheme.primary
                                    char != null -> MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                                    else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                                },
                                shape = RoundedCornerShape(12.dp)
                            )
                            .background(
                                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                RoundedCornerShape(12.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        if (char != null) {
                            Text(
                                text = char.toString(),
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                                textAlign = TextAlign.Center
                            )
                        } else if (isFocused) {
                            Divider(
                                modifier = Modifier
                                    .width(20.dp)
                                    .padding(top = 2.dp),
                                thickness = 2.dp,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        },
        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary)
    )
}

// ── Register Step ───────────────────────────────────────────────────
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
    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Please provide your name and an optional\nprofile photo",
        fontSize = 14.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        lineHeight = 20.sp
    )

    Spacer(modifier = Modifier.height(24.dp))

    // Avatar
    Box(
        modifier = Modifier
            .size(100.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primaryContainer)
            .clickable { onPickPhoto() },
        contentAlignment = Alignment.Center
    ) {
        if (profilePhotoUri != null) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier.size(56.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.tertiary),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Check, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onTertiary)
            }
        } else {
            Icon(
                imageVector = Icons.Default.CameraAlt,
                contentDescription = "Pick photo",
                modifier = Modifier.size(40.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }

    Spacer(modifier = Modifier.height(24.dp))

    OutlinedTextField(
        value = displayName,
        onValueChange = onNameChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text("Type your name here") },
        singleLine = true,
        shape = RoundedCornerShape(8.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = MaterialTheme.colorScheme.primary,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        ),
        leadingIcon = {
            Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.primary)
        }
    )

    Spacer(modifier = Modifier.height(12.dp))

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onBusinessChange(!isBusiness) }
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Checkbox(
            checked = isBusiness,
            onCheckedChange = onBusinessChange,
            colors = CheckboxDefaults.colors(checkedColor = MaterialTheme.colorScheme.primary)
        )
        Text(
            text = "This is a business account",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    error?.let {
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))

    Button(
        onClick = onRegister,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
        shape = RoundedCornerShape(28.dp),
        enabled = !isLoading && displayName.isNotBlank()
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                strokeWidth = 2.dp
            )
        } else {
            Text("Next", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

// ── Country Picker Dialog ───────────────────────────────────────────
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
            color = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.7f)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Choose a country",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Search") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    leadingIcon = {
                        Icon(Icons.Default.Search, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                LazyColumn {
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
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = country.dialCode,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Medium
                            )
                        }
                        if (index < filteredCountries.size - 1) {
                            Divider(color = MaterialTheme.colorScheme.outlineVariant)
                        }
                    }
                }
            }
        }
    }
}
