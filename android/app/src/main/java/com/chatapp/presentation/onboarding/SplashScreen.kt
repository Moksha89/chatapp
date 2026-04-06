package com.chatapp.presentation.onboarding

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onSplashFinished: () -> Unit
) {
    // Animation phases: 0=gray bubbles, 1=blue bubbles, 2=full blue, 3=logo+tagline
    var phase by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        delay(800)
        phase = 1
        delay(800)
        phase = 2
        delay(800)
        phase = 3
        delay(1600)
        onSplashFinished()
    }

    // Bubble animation
    val bubbleAlpha by animateFloatAsState(
        targetValue = if (phase >= 1) 1f else 0.35f,
        animationSpec = tween(600),
        label = "bubbleAlpha"
    )

    val bubbleScale by animateFloatAsState(
        targetValue = when (phase) {
            0 -> 0.8f
            1 -> 0.9f
            2 -> 1f
            else -> 0.6f
        },
        animationSpec = tween(500),
        label = "bubbleScale"
    )

    val bubbleColor = when {
        phase >= 2 -> Color(0xFF246BFD)
        phase >= 1 -> Color(0xFF5B9BFD)
        else -> Color(0xFFBBCCDD)
    }

    // Logo/tagline fade in at phase 3
    val logoAlpha by animateFloatAsState(
        targetValue = if (phase >= 3) 1f else 0f,
        animationSpec = tween(600),
        label = "logoAlpha"
    )

    val logoScale by animateFloatAsState(
        targetValue = if (phase >= 3) 1f else 0.7f,
        animationSpec = tween(500, easing = FastOutSlowInEasing),
        label = "logoScale"
    )

    // Circle background scale at phase 3
    val circleScale by animateFloatAsState(
        targetValue = if (phase >= 3) 1f else 0f,
        animationSpec = tween(800, easing = FastOutSlowInEasing),
        label = "circleScale"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (phase < 3) {
                // Phases 0-2: Animated chat bubbles
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .scale(bubbleScale),
                    contentAlignment = Alignment.Center
                ) {
                    // Back bubble (larger, slightly offset)
                    Icon(
                        imageVector = Icons.Default.ChatBubble,
                        contentDescription = null,
                        modifier = Modifier
                            .size(80.dp)
                            .offset(x = (-12).dp, y = (-8).dp)
                            .alpha(bubbleAlpha * 0.6f),
                        tint = bubbleColor.copy(alpha = 0.4f)
                    )
                    // Front bubble (smaller, offset right)
                    Icon(
                        imageVector = Icons.Default.ChatBubble,
                        contentDescription = null,
                        modifier = Modifier
                            .size(72.dp)
                            .offset(x = 12.dp, y = 8.dp)
                            .alpha(bubbleAlpha),
                        tint = bubbleColor
                    )
                }
            } else {
                // Phase 3: Logo + circle + tagline
                // App icon
                Box(
                    modifier = Modifier
                        .scale(logoScale)
                        .alpha(logoAlpha),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.ChatBubble,
                            contentDescription = null,
                            modifier = Modifier.size(32.dp),
                            tint = Color(0xFF246BFD)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Abhi",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Blue circle
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .scale(circleScale),
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        modifier = Modifier.size(140.dp),
                        shape = RoundedCornerShape(70.dp),
                        color = Color(0xFF246BFD).copy(alpha = 0.15f)
                    ) {}
                    Surface(
                        modifier = Modifier.size(100.dp),
                        shape = RoundedCornerShape(50.dp),
                        color = Color(0xFF246BFD).copy(alpha = 0.3f)
                    ) {}
                    Icon(
                        imageVector = Icons.Default.ChatBubble,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = Color(0xFF246BFD)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Tagline
                Text(
                    text = "Stay Connected",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onBackground,
                    modifier = Modifier.alpha(logoAlpha)
                )
                Text(
                    text = "Stay Chatting",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF246BFD),
                    modifier = Modifier.alpha(logoAlpha)
                )

                Spacer(modifier = Modifier.height(48.dp))

                // Version text
                Text(
                    text = "Version 2.1.0",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.alpha(logoAlpha)
                )
            }
        }

        // Bottom wave decoration
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0xFF246BFD).copy(alpha = 0.05f),
                            Color(0xFF246BFD).copy(alpha = 0.1f)
                        )
                    )
                )
        )
    }
}
