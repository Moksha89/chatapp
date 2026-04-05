package com.chatapp.presentation.common.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// E-Chat Design System Colors
private val EChatPrimary = Color(0xFF246BFD)
private val EChatPrimaryDark = Color(0xFF1A56DB)
private val EChatSecondary = Color(0xFF6C5CE7)

private val LightColorScheme = lightColorScheme(
    primary = EChatPrimary,
    onPrimary = Color.White,
    primaryContainer = EChatPrimaryDark,
    onPrimaryContainer = Color.White,
    secondary = EChatSecondary,
    onSecondary = Color.White,
    background = Color(0xFFF7F8FC),
    onBackground = Color(0xFF1A1A2E),
    surface = Color.White,
    onSurface = Color(0xFF1A1A2E),
    surfaceVariant = Color(0xFFE8F0FE),
    onSurfaceVariant = Color(0xFF6B7280)
)

private val DarkColorScheme = darkColorScheme(
    primary = EChatPrimary,
    onPrimary = Color.White,
    primaryContainer = EChatPrimaryDark,
    onPrimaryContainer = Color.White,
    secondary = EChatSecondary,
    onSecondary = Color.White,
    background = Color(0xFF121212),
    onBackground = Color.White,
    surface = Color(0xFF1E1E1E),
    onSurface = Color.White
)

@Composable
fun WhatsAppBusinessChatTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = EChatPrimary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
