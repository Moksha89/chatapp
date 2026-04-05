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

// Abhi Design System Colors
private val AbhiPrimary = Color(0xFF246BFD)
private val AbhiPrimaryDark = Color(0xFF1A56DB)
private val AbhiSecondary = Color(0xFF6C5CE7)

private val LightColorScheme = lightColorScheme(
    primary = AbhiPrimary,
    onPrimary = Color.White,
    primaryContainer = AbhiPrimaryDark,
    onPrimaryContainer = Color.White,
    secondary = AbhiSecondary,
    onSecondary = Color.White,
    background = Color(0xFFF7F8FC),
    onBackground = Color(0xFF1A1A2E),
    surface = Color.White,
    onSurface = Color(0xFF1A1A2E),
    surfaceVariant = Color(0xFFE8F0FE),
    onSurfaceVariant = Color(0xFF6B7280)
)

private val DarkColorScheme = darkColorScheme(
    primary = AbhiPrimary,
    onPrimary = Color.White,
    primaryContainer = AbhiPrimaryDark,
    onPrimaryContainer = Color.White,
    secondary = AbhiSecondary,
    onSecondary = Color.White,
    background = Color(0xFF121212),
    onBackground = Color.White,
    surface = Color(0xFF1E1E1E),
    onSurface = Color.White
)

@Composable
fun AbhiTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = AbhiPrimary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
