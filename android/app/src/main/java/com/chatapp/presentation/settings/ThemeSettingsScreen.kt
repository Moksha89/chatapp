package com.chatapp.presentation.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ThemeSettingsScreen(
    onBack: () -> Unit,
    viewModel: ThemeSettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) { viewModel.loadSettings() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Theme") },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            Text(
                "Display",
                modifier = Modifier.padding(16.dp),
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.primary
            )

            val themeOptions = listOf("system", "light", "dark")
            themeOptions.forEach { theme ->
                ListItem(
                    headlineContent = { Text(theme.replaceFirstChar { it.uppercase() }) },
                    leadingContent = {
                        RadioButton(
                            selected = uiState.currentTheme == theme,
                            onClick = { viewModel.updateTheme(theme) }
                        )
                    },
                    modifier = Modifier.clickable { viewModel.updateTheme(theme) }
                )
            }

            Divider(modifier = Modifier.padding(vertical = 8.dp))

            Text(
                "Font Size",
                modifier = Modifier.padding(16.dp),
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.primary
            )

            val fontSizes = listOf("small", "medium", "large")
            fontSizes.forEach { size ->
                ListItem(
                    headlineContent = { Text(size.replaceFirstChar { it.uppercase() }) },
                    leadingContent = {
                        RadioButton(
                            selected = uiState.currentFontSize == size,
                            onClick = { viewModel.updateFontSize(size) }
                        )
                    },
                    modifier = Modifier.clickable { viewModel.updateFontSize(size) }
                )
            }
        }
    }
}
