package com.chatapp.presentation.onboarding

import androidx.compose.animation.core.*
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

data class OnboardingSlide(
    val icon: ImageVector,
    val secondaryIcon: ImageVector? = null,
    val title: String,
    val description: String,
    val iconColor: Color = Color(0xFF246BFD),
    val bgColor: Color = Color(0xFFE8F0FE)
)

private val slides = listOf(
    OnboardingSlide(
        icon = Icons.Default.Groups,
        secondaryIcon = Icons.Default.Chat,
        title = "Group Chatting",
        description = "Connect with multiple members in group chats",
        iconColor = Color(0xFF246BFD),
        bgColor = Color(0xFFE8F0FE)
    ),
    OnboardingSlide(
        icon = Icons.Default.Videocam,
        secondaryIcon = Icons.Default.Call,
        title = "Video And Voice Calls",
        description = "Instantly connect via video and voice calls",
        iconColor = Color(0xFF1A56DB),
        bgColor = Color(0xFFE0ECFF)
    ),
    OnboardingSlide(
        icon = Icons.Default.Lock,
        secondaryIcon = Icons.Default.Shield,
        title = "Message Encryption",
        description = "Ensure privacy with encrypted messages",
        iconColor = Color(0xFF10B981),
        bgColor = Color(0xFFD1FAE5)
    ),
    OnboardingSlide(
        icon = Icons.Default.Devices,
        secondaryIcon = Icons.Default.Sync,
        title = "Cross-Platform Compatibility",
        description = "Access chats on any device seamlessly",
        iconColor = Color(0xFF8B5CF6),
        bgColor = Color(0xFFEDE9FE)
    )
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    onGetStarted: () -> Unit,
    onSkip: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { slides.size })
    val coroutineScope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Skip button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.End
            ) {
                TextButton(onClick = onSkip) {
                    Text(
                        "Skip",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp
                    )
                }
            }

            // Pager content
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f)
            ) { page ->
                OnboardingSlideContent(slide = slides[page])
            }

            // Get Started button
            Button(
                onClick = {
                    if (pagerState.currentPage < slides.size - 1) {
                        coroutineScope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    } else {
                        onGetStarted()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp)
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF246BFD)
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = if (pagerState.currentPage == slides.size - 1) "Get started" else "Next",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Bottom navigation: dots + Skip/Next
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onSkip) {
                    Text("Skip", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                }

                // Dot indicators
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    repeat(slides.size) { index ->
                        Box(
                            modifier = Modifier
                                .size(
                                    width = if (index == pagerState.currentPage) 24.dp else 8.dp,
                                    height = 8.dp
                                )
                                .clip(CircleShape)
                                .background(
                                    if (index == pagerState.currentPage)
                                        Color(0xFF246BFD)
                                    else
                                        Color(0xFFD1D5DB)
                                )
                        )
                    }
                }

                TextButton(
                    onClick = {
                        if (pagerState.currentPage < slides.size - 1) {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage + 1)
                            }
                        } else {
                            onGetStarted()
                        }
                    }
                ) {
                    Text(
                        if (pagerState.currentPage == slides.size - 1) "Done" else "Next",
                        color = Color(0xFF246BFD),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
        }

        // Bottom wave decoration
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0xFF246BFD).copy(alpha = 0.04f),
                            Color(0xFF246BFD).copy(alpha = 0.08f)
                        )
                    )
                )
        )
    }
}

@Composable
private fun OnboardingSlideContent(slide: OnboardingSlide) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Illustration placeholder with icons
        Box(
            modifier = Modifier
                .size(220.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(slide.bgColor),
            contentAlignment = Alignment.Center
        ) {
            // Main icon
            Icon(
                imageVector = slide.icon,
                contentDescription = null,
                modifier = Modifier.size(80.dp),
                tint = slide.iconColor
            )
            // Secondary icon (smaller, offset)
            slide.secondaryIcon?.let { secIcon ->
                Icon(
                    imageVector = secIcon,
                    contentDescription = null,
                    modifier = Modifier
                        .size(36.dp)
                        .align(Alignment.TopEnd)
                        .offset(x = (-24).dp, y = 24.dp),
                    tint = slide.iconColor.copy(alpha = 0.5f)
                )
            }
        }

        Spacer(modifier = Modifier.height(40.dp))

        // Title
        Text(
            text = slide.title,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Description
        Text(
            text = slide.description,
            fontSize = 15.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            lineHeight = 22.sp
        )
    }
}
