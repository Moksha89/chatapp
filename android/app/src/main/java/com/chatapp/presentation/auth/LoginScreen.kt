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

private val POPULAR_COUNTRY_CODES = listOf("IN", "US", "GB", "CA", "AU", "DE", "FR", "AE", "SA", "SG")
private const val RESEND_COOLDOWN = 30

private val countries = listOf(
    Country("Afghanistan", "AF", "+93", "\uD83C\uDDE6\uD83C\uDDEB"),
    Country("Albania", "AL", "+355", "\uD83C\uDDE6\uD83C\uDDF1"),
    Country("Algeria", "DZ", "+213", "\uD83C\uDDE9\uD83C\uDDFF"),
    Country("Andorra", "AD", "+376", "\uD83C\uDDE6\uD83C\uDDE9"),
    Country("Angola", "AO", "+244", "\uD83C\uDDE6\uD83C\uDDF4"),
    Country("Argentina", "AR", "+54", "\uD83C\uDDE6\uD83C\uDDF7"),
    Country("Armenia", "AM", "+374", "\uD83C\uDDE6\uD83C\uDDF2"),
    Country("Australia", "AU", "+61", "\uD83C\uDDE6\uD83C\uDDFA"),
    Country("Austria", "AT", "+43", "\uD83C\uDDE6\uD83C\uDDF9"),
    Country("Azerbaijan", "AZ", "+994", "\uD83C\uDDE6\uD83C\uDDFF"),
    Country("Bahamas", "BS", "+1242", "\uD83C\uDDE7\uD83C\uDDF8"),
    Country("Bahrain", "BH", "+973", "\uD83C\uDDE7\uD83C\uDDED"),
    Country("Bangladesh", "BD", "+880", "\uD83C\uDDE7\uD83C\uDDE9"),
    Country("Barbados", "BB", "+1246", "\uD83C\uDDE7\uD83C\uDDE7"),
    Country("Belarus", "BY", "+375", "\uD83C\uDDE7\uD83C\uDDFE"),
    Country("Belgium", "BE", "+32", "\uD83C\uDDE7\uD83C\uDDEA"),
    Country("Belize", "BZ", "+501", "\uD83C\uDDE7\uD83C\uDDFF"),
    Country("Benin", "BJ", "+229", "\uD83C\uDDE7\uD83C\uDDEF"),
    Country("Bhutan", "BT", "+975", "\uD83C\uDDE7\uD83C\uDDF9"),
    Country("Bolivia", "BO", "+591", "\uD83C\uDDE7\uD83C\uDDF4"),
    Country("Bosnia and Herzegovina", "BA", "+387", "\uD83C\uDDE7\uD83C\uDDE6"),
    Country("Botswana", "BW", "+267", "\uD83C\uDDE7\uD83C\uDDFC"),
    Country("Brazil", "BR", "+55", "\uD83C\uDDE7\uD83C\uDDF7"),
    Country("Brunei", "BN", "+673", "\uD83C\uDDE7\uD83C\uDDF3"),
    Country("Bulgaria", "BG", "+359", "\uD83C\uDDE7\uD83C\uDDEC"),
    Country("Burkina Faso", "BF", "+226", "\uD83C\uDDE7\uD83C\uDDEB"),
    Country("Burundi", "BI", "+257", "\uD83C\uDDE7\uD83C\uDDEE"),
    Country("Cambodia", "KH", "+855", "\uD83C\uDDF0\uD83C\uDDED"),
    Country("Cameroon", "CM", "+237", "\uD83C\uDDE8\uD83C\uDDF2"),
    Country("Canada", "CA", "+1", "\uD83C\uDDE8\uD83C\uDDE6"),
    Country("Cape Verde", "CV", "+238", "\uD83C\uDDE8\uD83C\uDDFB"),
    Country("Central African Republic", "CF", "+236", "\uD83C\uDDE8\uD83C\uDDEB"),
    Country("Chad", "TD", "+235", "\uD83C\uDDF9\uD83C\uDDE9"),
    Country("Chile", "CL", "+56", "\uD83C\uDDE8\uD83C\uDDF1"),
    Country("China", "CN", "+86", "\uD83C\uDDE8\uD83C\uDDF3"),
    Country("Colombia", "CO", "+57", "\uD83C\uDDE8\uD83C\uDDF4"),
    Country("Comoros", "KM", "+269", "\uD83C\uDDF0\uD83C\uDDF2"),
    Country("Congo", "CG", "+242", "\uD83C\uDDE8\uD83C\uDDEC"),
    Country("Costa Rica", "CR", "+506", "\uD83C\uDDE8\uD83C\uDDF7"),
    Country("Croatia", "HR", "+385", "\uD83C\uDDED\uD83C\uDDF7"),
    Country("Cuba", "CU", "+53", "\uD83C\uDDE8\uD83C\uDDFA"),
    Country("Cyprus", "CY", "+357", "\uD83C\uDDE8\uD83C\uDDFE"),
    Country("Czech Republic", "CZ", "+420", "\uD83C\uDDE8\uD83C\uDDFF"),
    Country("Denmark", "DK", "+45", "\uD83C\uDDE9\uD83C\uDDF0"),
    Country("Djibouti", "DJ", "+253", "\uD83C\uDDE9\uD83C\uDDEF"),
    Country("Dominican Republic", "DO", "+1809", "\uD83C\uDDE9\uD83C\uDDF4"),
    Country("DR Congo", "CD", "+243", "\uD83C\uDDE8\uD83C\uDDE9"),
    Country("Ecuador", "EC", "+593", "\uD83C\uDDEA\uD83C\uDDE8"),
    Country("Egypt", "EG", "+20", "\uD83C\uDDEA\uD83C\uDDEC"),
    Country("El Salvador", "SV", "+503", "\uD83C\uDDF8\uD83C\uDDFB"),
    Country("Equatorial Guinea", "GQ", "+240", "\uD83C\uDDEC\uD83C\uDDF6"),
    Country("Eritrea", "ER", "+291", "\uD83C\uDDEA\uD83C\uDDF7"),
    Country("Estonia", "EE", "+372", "\uD83C\uDDEA\uD83C\uDDEA"),
    Country("Eswatini", "SZ", "+268", "\uD83C\uDDF8\uD83C\uDDFF"),
    Country("Ethiopia", "ET", "+251", "\uD83C\uDDEA\uD83C\uDDF9"),
    Country("Fiji", "FJ", "+679", "\uD83C\uDDEB\uD83C\uDDEF"),
    Country("Finland", "FI", "+358", "\uD83C\uDDEB\uD83C\uDDEE"),
    Country("France", "FR", "+33", "\uD83C\uDDEB\uD83C\uDDF7"),
    Country("Gabon", "GA", "+241", "\uD83C\uDDEC\uD83C\uDDE6"),
    Country("Gambia", "GM", "+220", "\uD83C\uDDEC\uD83C\uDDF2"),
    Country("Georgia", "GE", "+995", "\uD83C\uDDEC\uD83C\uDDEA"),
    Country("Germany", "DE", "+49", "\uD83C\uDDE9\uD83C\uDDEA"),
    Country("Ghana", "GH", "+233", "\uD83C\uDDEC\uD83C\uDDED"),
    Country("Greece", "GR", "+30", "\uD83C\uDDEC\uD83C\uDDF7"),
    Country("Guatemala", "GT", "+502", "\uD83C\uDDEC\uD83C\uDDF9"),
    Country("Guinea", "GN", "+224", "\uD83C\uDDEC\uD83C\uDDF3"),
    Country("Guyana", "GY", "+592", "\uD83C\uDDEC\uD83C\uDDFE"),
    Country("Haiti", "HT", "+509", "\uD83C\uDDED\uD83C\uDDF9"),
    Country("Honduras", "HN", "+504", "\uD83C\uDDED\uD83C\uDDF3"),
    Country("Hong Kong", "HK", "+852", "\uD83C\uDDED\uD83C\uDDF0"),
    Country("Hungary", "HU", "+36", "\uD83C\uDDED\uD83C\uDDFA"),
    Country("Iceland", "IS", "+354", "\uD83C\uDDEE\uD83C\uDDF8"),
    Country("India", "IN", "+91", "\uD83C\uDDEE\uD83C\uDDF3"),
    Country("Indonesia", "ID", "+62", "\uD83C\uDDEE\uD83C\uDDE9"),
    Country("Iran", "IR", "+98", "\uD83C\uDDEE\uD83C\uDDF7"),
    Country("Iraq", "IQ", "+964", "\uD83C\uDDEE\uD83C\uDDF6"),
    Country("Ireland", "IE", "+353", "\uD83C\uDDEE\uD83C\uDDEA"),
    Country("Israel", "IL", "+972", "\uD83C\uDDEE\uD83C\uDDF1"),
    Country("Italy", "IT", "+39", "\uD83C\uDDEE\uD83C\uDDF9"),
    Country("Ivory Coast", "CI", "+225", "\uD83C\uDDE8\uD83C\uDDEE"),
    Country("Jamaica", "JM", "+1876", "\uD83C\uDDEF\uD83C\uDDF2"),
    Country("Japan", "JP", "+81", "\uD83C\uDDEF\uD83C\uDDF5"),
    Country("Jordan", "JO", "+962", "\uD83C\uDDEF\uD83C\uDDF4"),
    Country("Kazakhstan", "KZ", "+7", "\uD83C\uDDF0\uD83C\uDDFF"),
    Country("Kenya", "KE", "+254", "\uD83C\uDDF0\uD83C\uDDEA"),
    Country("Kuwait", "KW", "+965", "\uD83C\uDDF0\uD83C\uDDFC"),
    Country("Kyrgyzstan", "KG", "+996", "\uD83C\uDDF0\uD83C\uDDEC"),
    Country("Laos", "LA", "+856", "\uD83C\uDDF1\uD83C\uDDE6"),
    Country("Latvia", "LV", "+371", "\uD83C\uDDF1\uD83C\uDDFB"),
    Country("Lebanon", "LB", "+961", "\uD83C\uDDF1\uD83C\uDDE7"),
    Country("Lesotho", "LS", "+266", "\uD83C\uDDF1\uD83C\uDDF8"),
    Country("Liberia", "LR", "+231", "\uD83C\uDDF1\uD83C\uDDF7"),
    Country("Libya", "LY", "+218", "\uD83C\uDDF1\uD83C\uDDFE"),
    Country("Liechtenstein", "LI", "+423", "\uD83C\uDDF1\uD83C\uDDEE"),
    Country("Lithuania", "LT", "+370", "\uD83C\uDDF1\uD83C\uDDF9"),
    Country("Luxembourg", "LU", "+352", "\uD83C\uDDF1\uD83C\uDDFA"),
    Country("Macau", "MO", "+853", "\uD83C\uDDF2\uD83C\uDDF4"),
    Country("Madagascar", "MG", "+261", "\uD83C\uDDF2\uD83C\uDDEC"),
    Country("Malawi", "MW", "+265", "\uD83C\uDDF2\uD83C\uDDFC"),
    Country("Malaysia", "MY", "+60", "\uD83C\uDDF2\uD83C\uDDFE"),
    Country("Maldives", "MV", "+960", "\uD83C\uDDF2\uD83C\uDDFB"),
    Country("Mali", "ML", "+223", "\uD83C\uDDF2\uD83C\uDDF1"),
    Country("Malta", "MT", "+356", "\uD83C\uDDF2\uD83C\uDDF9"),
    Country("Mauritania", "MR", "+222", "\uD83C\uDDF2\uD83C\uDDF7"),
    Country("Mauritius", "MU", "+230", "\uD83C\uDDF2\uD83C\uDDFA"),
    Country("Mexico", "MX", "+52", "\uD83C\uDDF2\uD83C\uDDFD"),
    Country("Moldova", "MD", "+373", "\uD83C\uDDF2\uD83C\uDDE9"),
    Country("Monaco", "MC", "+377", "\uD83C\uDDF2\uD83C\uDDE8"),
    Country("Mongolia", "MN", "+976", "\uD83C\uDDF2\uD83C\uDDF3"),
    Country("Montenegro", "ME", "+382", "\uD83C\uDDF2\uD83C\uDDEA"),
    Country("Morocco", "MA", "+212", "\uD83C\uDDF2\uD83C\uDDE6"),
    Country("Mozambique", "MZ", "+258", "\uD83C\uDDF2\uD83C\uDDFF"),
    Country("Myanmar", "MM", "+95", "\uD83C\uDDF2\uD83C\uDDF2"),
    Country("Namibia", "NA", "+264", "\uD83C\uDDF3\uD83C\uDDE6"),
    Country("Nepal", "NP", "+977", "\uD83C\uDDF3\uD83C\uDDF5"),
    Country("Netherlands", "NL", "+31", "\uD83C\uDDF3\uD83C\uDDF1"),
    Country("New Zealand", "NZ", "+64", "\uD83C\uDDF3\uD83C\uDDFF"),
    Country("Nicaragua", "NI", "+505", "\uD83C\uDDF3\uD83C\uDDEE"),
    Country("Niger", "NE", "+227", "\uD83C\uDDF3\uD83C\uDDEA"),
    Country("Nigeria", "NG", "+234", "\uD83C\uDDF3\uD83C\uDDEC"),
    Country("North Korea", "KP", "+850", "\uD83C\uDDF0\uD83C\uDDF5"),
    Country("North Macedonia", "MK", "+389", "\uD83C\uDDF2\uD83C\uDDF0"),
    Country("Norway", "NO", "+47", "\uD83C\uDDF3\uD83C\uDDF4"),
    Country("Oman", "OM", "+968", "\uD83C\uDDF4\uD83C\uDDF2"),
    Country("Pakistan", "PK", "+92", "\uD83C\uDDF5\uD83C\uDDF0"),
    Country("Palestine", "PS", "+970", "\uD83C\uDDF5\uD83C\uDDF8"),
    Country("Panama", "PA", "+507", "\uD83C\uDDF5\uD83C\uDDE6"),
    Country("Papua New Guinea", "PG", "+675", "\uD83C\uDDF5\uD83C\uDDEC"),
    Country("Paraguay", "PY", "+595", "\uD83C\uDDF5\uD83C\uDDFE"),
    Country("Peru", "PE", "+51", "\uD83C\uDDF5\uD83C\uDDEA"),
    Country("Philippines", "PH", "+63", "\uD83C\uDDF5\uD83C\uDDED"),
    Country("Poland", "PL", "+48", "\uD83C\uDDF5\uD83C\uDDF1"),
    Country("Portugal", "PT", "+351", "\uD83C\uDDF5\uD83C\uDDF9"),
    Country("Qatar", "QA", "+974", "\uD83C\uDDF6\uD83C\uDDE6"),
    Country("Romania", "RO", "+40", "\uD83C\uDDF7\uD83C\uDDF4"),
    Country("Russia", "RU", "+7", "\uD83C\uDDF7\uD83C\uDDFA"),
    Country("Rwanda", "RW", "+250", "\uD83C\uDDF7\uD83C\uDDFC"),
    Country("Saudi Arabia", "SA", "+966", "\uD83C\uDDF8\uD83C\uDDE6"),
    Country("Senegal", "SN", "+221", "\uD83C\uDDF8\uD83C\uDDF3"),
    Country("Serbia", "RS", "+381", "\uD83C\uDDF7\uD83C\uDDF8"),
    Country("Sierra Leone", "SL", "+232", "\uD83C\uDDF8\uD83C\uDDF1"),
    Country("Singapore", "SG", "+65", "\uD83C\uDDF8\uD83C\uDDEC"),
    Country("Slovakia", "SK", "+421", "\uD83C\uDDF8\uD83C\uDDF0"),
    Country("Slovenia", "SI", "+386", "\uD83C\uDDF8\uD83C\uDDEE"),
    Country("Solomon Islands", "SB", "+677", "\uD83C\uDDF8\uD83C\uDDE7"),
    Country("Somalia", "SO", "+252", "\uD83C\uDDF8\uD83C\uDDF4"),
    Country("South Africa", "ZA", "+27", "\uD83C\uDDFF\uD83C\uDDE6"),
    Country("South Korea", "KR", "+82", "\uD83C\uDDF0\uD83C\uDDF7"),
    Country("South Sudan", "SS", "+211", "\uD83C\uDDF8\uD83C\uDDF8"),
    Country("Spain", "ES", "+34", "\uD83C\uDDEA\uD83C\uDDF8"),
    Country("Sri Lanka", "LK", "+94", "\uD83C\uDDF1\uD83C\uDDF0"),
    Country("Sudan", "SD", "+249", "\uD83C\uDDF8\uD83C\uDDE9"),
    Country("Suriname", "SR", "+597", "\uD83C\uDDF8\uD83C\uDDF7"),
    Country("Sweden", "SE", "+46", "\uD83C\uDDF8\uD83C\uDDEA"),
    Country("Switzerland", "CH", "+41", "\uD83C\uDDE8\uD83C\uDDED"),
    Country("Syria", "SY", "+963", "\uD83C\uDDF8\uD83C\uDDFE"),
    Country("Taiwan", "TW", "+886", "\uD83C\uDDF9\uD83C\uDDFC"),
    Country("Tajikistan", "TJ", "+992", "\uD83C\uDDF9\uD83C\uDDEF"),
    Country("Tanzania", "TZ", "+255", "\uD83C\uDDF9\uD83C\uDDFF"),
    Country("Thailand", "TH", "+66", "\uD83C\uDDF9\uD83C\uDDED"),
    Country("Togo", "TG", "+228", "\uD83C\uDDF9\uD83C\uDDEC"),
    Country("Tonga", "TO", "+676", "\uD83C\uDDF9\uD83C\uDDF4"),
    Country("Trinidad and Tobago", "TT", "+1868", "\uD83C\uDDF9\uD83C\uDDF9"),
    Country("Tunisia", "TN", "+216", "\uD83C\uDDF9\uD83C\uDDF3"),
    Country("Turkey", "TR", "+90", "\uD83C\uDDF9\uD83C\uDDF7"),
    Country("Turkmenistan", "TM", "+993", "\uD83C\uDDF9\uD83C\uDDF2"),
    Country("Tuvalu", "TV", "+688", "\uD83C\uDDF9\uD83C\uDDFB"),
    Country("Uganda", "UG", "+256", "\uD83C\uDDFA\uD83C\uDDEC"),
    Country("Ukraine", "UA", "+380", "\uD83C\uDDFA\uD83C\uDDE6"),
    Country("United Arab Emirates", "AE", "+971", "\uD83C\uDDE6\uD83C\uDDEA"),
    Country("United Kingdom", "GB", "+44", "\uD83C\uDDEC\uD83C\uDDE7"),
    Country("United States", "US", "+1", "\uD83C\uDDFA\uD83C\uDDF8"),
    Country("Uruguay", "UY", "+598", "\uD83C\uDDFA\uD83C\uDDFE"),
    Country("Uzbekistan", "UZ", "+998", "\uD83C\uDDFA\uD83C\uDDFF"),
    Country("Vanuatu", "VU", "+678", "\uD83C\uDDFB\uD83C\uDDFA"),
    Country("Vatican City", "VA", "+379", "\uD83C\uDDFB\uD83C\uDDE6"),
    Country("Venezuela", "VE", "+58", "\uD83C\uDDFB\uD83C\uDDEA"),
    Country("Vietnam", "VN", "+84", "\uD83C\uDDFB\uD83C\uDDF3"),
    Country("Yemen", "YE", "+967", "\uD83C\uDDFE\uD83C\uDDEA"),
    Country("Zambia", "ZM", "+260", "\uD83C\uDDFF\uD83C\uDDF2"),
    Country("Zimbabwe", "ZW", "+263", "\uD83C\uDDFF\uD83C\uDDFC"),

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
    var resendTimer by remember { mutableIntStateOf(RESEND_COOLDOWN) }
    var otpSentCount by remember { mutableIntStateOf(1) }

    // Resend cooldown timer
    LaunchedEffect(resendTimer) {
        if (resendTimer > 0) {
            kotlinx.coroutines.delay(1000L)
            resendTimer--
        }
    }

    // Auto-verify when 6 digits entered
    LaunchedEffect(otp) {
        if (otp.length == 6 && !isLoading) {
            onVerify()
        }
    }

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Enter the 6-digit code sent to",
        fontSize = 14.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        lineHeight = 20.sp
    )
    Text(
        text = phoneNumber,
        fontSize = 15.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurface,
        textAlign = TextAlign.Center
    )

    TextButton(onClick = onChangeNumber) {
        Text("Wrong number?", color = MaterialTheme.colorScheme.primary, fontSize = 14.sp)
    }

    Spacer(modifier = Modifier.height(24.dp))

    OtpInputRow(otpValue = otp, onOtpChange = onOtpChange, otpLength = 6)

    error?.let {
        Spacer(modifier = Modifier.height(12.dp))
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = MaterialTheme.colorScheme.errorContainer,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Warning,
                    null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }
        }
    }

    Spacer(modifier = Modifier.height(24.dp))

    // Resend timer
    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        if (resendTimer > 0) {
            Icon(
                Icons.Default.Schedule,
                null,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "Resend code in ${resendTimer}s",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            Text("Didn't receive code? ", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                text = "Resend",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable {
                    onResend()
                    resendTimer = RESEND_COOLDOWN
                    otpSentCount++
                }
            )
            if (otpSentCount > 1) {
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "(sent ${otpSentCount}x)",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )
            }
        }
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
    val popularCountries = remember { countries.filter { it.code in POPULAR_COUNTRY_CODES }.sortedBy { POPULAR_COUNTRY_CODES.indexOf(it.code) } }
    val filteredCountries = if (searchQuery.isBlank()) countries.sortedBy { it.name }
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
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Choose a country",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "${countries.size} countries",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Search by name, code, or dial code") },
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
                    // Popular countries section (only when not searching)
                    if (searchQuery.isBlank()) {
                        item {
                            Text(
                                text = "POPULAR",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                letterSpacing = 1.sp,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                        items(popularCountries.size) { index ->
                            CountryRow(popularCountries[index], onSelect)
                            if (index < popularCountries.size - 1) {
                                Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                            }
                        }
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "ALL COUNTRIES",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                letterSpacing = 1.sp,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                    }
                    items(filteredCountries.size) { index ->
                        CountryRow(filteredCountries[index], onSelect)
                        if (index < filteredCountries.size - 1) {
                            Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                        }
                    }
                    if (filteredCountries.isEmpty()) {
                        item {
                            Text(
                                text = "No countries found",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 24.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CountryRow(country: Country, onSelect: (Country) -> Unit) {
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
}
