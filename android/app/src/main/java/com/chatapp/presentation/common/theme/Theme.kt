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

// ── Abhi Brand Palette ──────────────────────────────────────────────
val AbhiBlue        = Color(0xFF246BFD)
val AbhiBlueLight   = Color(0xFF5B9BFD)
val AbhiBlueDark    = Color(0xFF1A56DB)
val AbhiPurple      = Color(0xFF6C5CE7)
val AbhiGreen       = Color(0xFF10B981)
val AbhiRed         = Color(0xFFEF4444)
val AbhiOrange      = Color(0xFFFF9800)

// Chat bubble colours
val OwnBubbleLight  = Color(0xFF246BFD)
val OwnBubbleDark   = Color(0xFF1A56DB)
val PeerBubbleLight = Color(0xFFF2F2F7)
val PeerBubbleDark  = Color(0xFF2A2A3C)

private val LightColorScheme = lightColorScheme(
    primary            = AbhiBlue,
    onPrimary          = Color.White,
    primaryContainer   = Color(0xFFDCE8FF),
    onPrimaryContainer = AbhiBlueDark,
    secondary          = AbhiPurple,
    onSecondary        = Color.White,
    secondaryContainer = Color(0xFFEDE9FE),
    onSecondaryContainer = Color(0xFF4A3DAF),
    tertiary           = AbhiGreen,
    onTertiary         = Color.White,
    error              = AbhiRed,
    onError            = Color.White,
    background         = Color(0xFFF7F8FC),
    onBackground       = Color(0xFF1A1A2E),
    surface            = Color.White,
    onSurface          = Color(0xFF1A1A2E),
    surfaceVariant     = Color(0xFFF0F2F5),
    onSurfaceVariant   = Color(0xFF65676B),
    outline            = Color(0xFFD1D5DB),
    outlineVariant     = Color(0xFFE5E7EB),
    inverseSurface     = Color(0xFF1A1A2E),
    inverseOnSurface   = Color.White,
    surfaceTint        = AbhiBlue
)

private val DarkColorScheme = darkColorScheme(
    primary            = AbhiBlue,
    onPrimary          = Color.White,
    primaryContainer   = Color(0xFF1A3A6E),
    onPrimaryContainer = Color(0xFFBBD4FF),
    secondary          = AbhiPurple,
    onSecondary        = Color.White,
    secondaryContainer = Color(0xFF352D6E),
    onSecondaryContainer = Color(0xFFD1CCFE),
    tertiary           = AbhiGreen,
    onTertiary         = Color.White,
    error              = Color(0xFFF87171),
    onError            = Color.White,
    background         = Color(0xFF111827),
    onBackground       = Color(0xFFF3F4F6),
    surface            = Color(0xFF1F2937),
    onSurface          = Color(0xFFF3F4F6),
    surfaceVariant     = Color(0xFF374151),
    onSurfaceVariant   = Color(0xFF9CA3AF),
    outline            = Color(0xFF4B5563),
    outlineVariant     = Color(0xFF374151),
    inverseSurface     = Color(0xFFF3F4F6),
    inverseOnSurface   = Color(0xFF111827),
    surfaceTint        = AbhiBlue
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
            window.statusBarColor = if (darkTheme) Color(0xFF111827).toArgb() else AbhiBlue.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
