package com.chatapp.presentation.chat

import android.util.Log
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.ImageLoader
import coil.compose.AsyncImage
import coil.decode.GifDecoder
import coil.request.ImageRequest
import com.chatapp.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL

@Composable
fun EmojiPickerView(
    onEmojiSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedCategory by remember { mutableIntStateOf(0) }

    val categories = listOf(
        "Smileys" to SMILEYS,
        "People" to PEOPLE,
        "Animals" to ANIMALS,
        "Food" to FOOD,
        "Activities" to ACTIVITIES,
        "Objects" to OBJECTS,
        "Symbols" to SYMBOLS
    )

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(280.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp
    ) {
        Column {
            // Category tabs
            ScrollableTabRow(
                selectedTabIndex = selectedCategory,
                containerColor = Color.Transparent,
                contentColor = MaterialTheme.colorScheme.primary,
                edgePadding = 0.dp
            ) {
                categories.forEachIndexed { index, (name, _) ->
                    Tab(
                        selected = selectedCategory == index,
                        onClick = { selectedCategory = index },
                        text = { Text(name, fontSize = 12.sp) }
                    )
                }
            }

            // Emoji grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(8),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(4.dp),
                contentPadding = PaddingValues(4.dp)
            ) {
                items(categories[selectedCategory].second) { emoji ->
                    Text(
                        text = emoji,
                        fontSize = 24.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .padding(4.dp)
                            .clickable { onEmojiSelected(emoji) }
                    )
                }
            }
        }
    }
}

// Enhanced Emoji/GIF/Sticker picker with tabs
@Composable
fun EnhancedEmojiPickerView(
    onEmojiSelected: (String) -> Unit,
    onGifSelected: (String) -> Unit,
    onStickerSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var selectedEmojiCategory by remember { mutableIntStateOf(0) }

    val emojiCategories = listOf(
        "Smileys" to SMILEYS,
        "People" to PEOPLE,
        "Animals" to ANIMALS,
        "Food" to FOOD,
        "Activities" to ACTIVITIES,
        "Objects" to OBJECTS,
        "Symbols" to SYMBOLS
    )

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(300.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp
    ) {
        Column {
            // Top tabs: Emoji / GIF / Stickers
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.primary
            ) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.EmojiEmotions, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Emoji", fontSize = 13.sp)
                    }
                }
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Gif, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("GIF", fontSize = 13.sp)
                    }
                }
                Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.SentimentVerySatisfied, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Stickers", fontSize = 13.sp)
                    }
                }
            }

            when (selectedTab) {
                0 -> {
                    // Emoji category tabs
                    ScrollableTabRow(
                        selectedTabIndex = selectedEmojiCategory,
                        containerColor = Color.Transparent,
                        contentColor = MaterialTheme.colorScheme.primary,
                        edgePadding = 0.dp
                    ) {
                        emojiCategories.forEachIndexed { index, (name, _) ->
                            Tab(
                                selected = selectedEmojiCategory == index,
                                onClick = { selectedEmojiCategory = index },
                                text = { Text(name, fontSize = 11.sp) }
                            )
                        }
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(8),
                        modifier = Modifier.fillMaxSize().padding(4.dp),
                        contentPadding = PaddingValues(4.dp)
                    ) {
                        items(emojiCategories[selectedEmojiCategory].second) { emoji ->
                            Text(
                                text = emoji,
                                fontSize = 24.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(4.dp).clickable { onEmojiSelected(emoji) }
                            )
                        }
                    }
                }
                1 -> {
                    // GIF picker with Giphy API
                    GiphyGifPicker(onGifSelected = onGifSelected)
                }
                2 -> {
                    // Sticker picker with Giphy Stickers API
                    GiphyStickerPicker(onStickerSelected = onStickerSelected)
                }
            }
        }
    }
}

/** Fetch GIFs from Giphy API */
private suspend fun fetchGiphyGifs(query: String = ""): List<Pair<String, String>> {
    return withContext(Dispatchers.IO) {
        try {
            val apiKey = BuildConfig.GIPHY_API_KEY
            val endpoint = if (query.isBlank()) {
                "https://api.giphy.com/v1/gifs/trending?api_key=$apiKey&limit=24&rating=g"
            } else {
                "https://api.giphy.com/v1/gifs/search?api_key=$apiKey&q=${java.net.URLEncoder.encode(query, "UTF-8")}&limit=24&rating=g"
            }
            val json = URL(endpoint).readText()
            val root = JSONObject(json)
            val data = root.getJSONArray("data")
            val results = mutableListOf<Pair<String, String>>()
            for (i in 0 until data.length()) {
                val gif = data.getJSONObject(i)
                val images = gif.getJSONObject("images")
                // Use fixed_width for preview, original for sending
                val previewUrl = images.getJSONObject("fixed_width").optString("url", "")
                val originalUrl = images.getJSONObject("original").optString("url", "")
                if (previewUrl.isNotEmpty() && originalUrl.isNotEmpty()) {
                    results.add(previewUrl to originalUrl)
                }
            }
            results
        } catch (e: Exception) {
            Log.e("GiphyPicker", "Failed to fetch GIFs", e)
            emptyList()
        }
    }
}

/** Fetch Stickers from Giphy Stickers API */
private suspend fun fetchGiphyStickers(query: String = ""): List<Pair<String, String>> {
    return withContext(Dispatchers.IO) {
        try {
            val apiKey = BuildConfig.GIPHY_API_KEY
            val endpoint = if (query.isBlank()) {
                "https://api.giphy.com/v1/stickers/trending?api_key=$apiKey&limit=24&rating=g"
            } else {
                "https://api.giphy.com/v1/stickers/search?api_key=$apiKey&q=${java.net.URLEncoder.encode(query, "UTF-8")}&limit=24&rating=g"
            }
            val json = URL(endpoint).readText()
            val root = JSONObject(json)
            val data = root.getJSONArray("data")
            val results = mutableListOf<Pair<String, String>>()
            for (i in 0 until data.length()) {
                val sticker = data.getJSONObject(i)
                val images = sticker.getJSONObject("images")
                val previewUrl = images.getJSONObject("fixed_width").optString("url", "")
                val originalUrl = images.getJSONObject("original").optString("url", "")
                if (previewUrl.isNotEmpty() && originalUrl.isNotEmpty()) {
                    results.add(previewUrl to originalUrl)
                }
            }
            results
        } catch (e: Exception) {
            Log.e("GiphyPicker", "Failed to fetch stickers", e)
            emptyList()
        }
    }
}

@Composable
fun GiphyGifPicker(onGifSelected: (String) -> Unit) {
    var searchQuery by remember { mutableStateOf("") }
    var gifs by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val context = LocalContext.current
    val gifImageLoader = remember {
        ImageLoader.Builder(context)
            .components { add(GifDecoder.Factory()) }
            .build()
    }

    LaunchedEffect(searchQuery) {
        isLoading = true
        gifs = fetchGiphyGifs(searchQuery)
        isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize().padding(8.dp)) {
        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search GIFs...", fontSize = 13.sp) },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            singleLine = true,
            textStyle = LocalTextStyle.current.copy(fontSize = 13.sp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { /* search triggers via LaunchedEffect */ }),
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        )
        Spacer(modifier = Modifier.height(4.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(modifier = Modifier.size(32.dp))
            }
        } else if (gifs.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No GIFs found", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(2.dp)
            ) {
                items(gifs) { (previewUrl, originalUrl) ->
                    Surface(
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .padding(2.dp)
                            .aspectRatio(1f)
                            .clickable { onGifSelected(originalUrl) }
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(previewUrl)
                                .crossfade(true)
                                .build(),
                            imageLoader = gifImageLoader,
                            contentDescription = "GIF",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun GiphyStickerPicker(onStickerSelected: (String) -> Unit) {
    var searchQuery by remember { mutableStateOf("") }
    var stickers by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val context = LocalContext.current
    val gifImageLoader = remember {
        ImageLoader.Builder(context)
            .components { add(GifDecoder.Factory()) }
            .build()
    }

    LaunchedEffect(searchQuery) {
        isLoading = true
        stickers = fetchGiphyStickers(searchQuery)
        isLoading = false
    }

    Column(modifier = Modifier.fillMaxSize().padding(8.dp)) {
        // Search bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search stickers...", fontSize = 13.sp) },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            singleLine = true,
            textStyle = LocalTextStyle.current.copy(fontSize = 13.sp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { /* search triggers via LaunchedEffect */ }),
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        )
        Spacer(modifier = Modifier.height(4.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(modifier = Modifier.size(32.dp))
            }
        } else if (stickers.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No stickers found", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(4),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(2.dp)
            ) {
                items(stickers) { (previewUrl, originalUrl) ->
                    Surface(
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .padding(2.dp)
                            .aspectRatio(1f)
                            .clickable { onStickerSelected(originalUrl) }
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(previewUrl)
                                .crossfade(true)
                                .build(),
                            imageLoader = gifImageLoader,
                            contentDescription = "Sticker",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize().padding(4.dp)
                        )
                    }
                }
            }
        }
    }
}

val SMILEYS = listOf(
    "\uD83D\uDE00", "\uD83D\uDE03", "\uD83D\uDE04", "\uD83D\uDE01", "\uD83D\uDE06",
    "\uD83D\uDE05", "\uD83D\uDE02", "\uD83E\uDD23", "\uD83D\uDE0A", "\uD83D\uDE07",
    "\uD83D\uDE42", "\uD83D\uDE43", "\uD83D\uDE09", "\uD83D\uDE0C", "\uD83D\uDE0D",
    "\uD83E\uDD70", "\uD83D\uDE18", "\uD83D\uDE17", "\uD83D\uDE19", "\uD83D\uDE1A",
    "\uD83D\uDE0B", "\uD83D\uDE1B", "\uD83D\uDE1C", "\uD83E\uDD2A", "\uD83D\uDE1D",
    "\uD83E\uDD11", "\uD83E\uDD17", "\uD83E\uDD2D", "\uD83E\uDD2B", "\uD83E\uDD14",
    "\uD83E\uDD10", "\uD83E\uDD28", "\uD83D\uDE10", "\uD83D\uDE11", "\uD83D\uDE36",
    "\uD83D\uDE0F", "\uD83D\uDE12", "\uD83D\uDE44", "\uD83D\uDE2C", "\uD83E\uDD25",
    "\uD83D\uDE0C", "\uD83D\uDE14", "\uD83D\uDE2A", "\uD83E\uDD24", "\uD83D\uDE34",
    "\uD83D\uDE37", "\uD83E\uDD12", "\uD83E\uDD15", "\uD83E\uDD22", "\uD83E\uDD2E",
    "\uD83D\uDE27", "\uD83D\uDE28", "\uD83D\uDE30", "\uD83D\uDE31", "\uD83E\uDD2F",
    "\uD83D\uDE33", "\uD83E\uDD2F", "\uD83D\uDE21", "\uD83D\uDE20", "\uD83E\uDD2C"
)

val PEOPLE = listOf(
    "\uD83D\uDC4B", "\uD83E\uDD1A", "\uD83D\uDD90\uFE0F", "\u270B", "\uD83D\uDD96",
    "\uD83D\uDC4C", "\uD83E\uDD0C", "\uD83E\uDD0F", "\u270C\uFE0F", "\uD83E\uDD1E",
    "\uD83E\uDD1F", "\uD83E\uDD18", "\uD83E\uDD19", "\uD83D\uDC48", "\uD83D\uDC49",
    "\uD83D\uDC46", "\uD83D\uDC47", "\u261D\uFE0F", "\uD83D\uDC4D", "\uD83D\uDC4E",
    "\u270A", "\uD83D\uDC4A", "\uD83E\uDD1B", "\uD83E\uDD1C", "\uD83D\uDC4F",
    "\uD83D\uDE4C", "\uD83D\uDC50", "\uD83E\uDD32", "\uD83E\uDD1D", "\uD83D\uDE4F"
)

val ANIMALS = listOf(
    "\uD83D\uDC36", "\uD83D\uDC31", "\uD83D\uDC2D", "\uD83D\uDC39", "\uD83D\uDC30",
    "\uD83E\uDD8A", "\uD83D\uDC3B", "\uD83D\uDC3C", "\uD83D\uDC28", "\uD83D\uDC2F",
    "\uD83E\uDD81", "\uD83D\uDC2E", "\uD83D\uDC37", "\uD83D\uDC38", "\uD83D\uDC35",
    "\uD83D\uDC14", "\uD83D\uDC27", "\uD83D\uDC26", "\uD83E\uDD85", "\uD83E\uDD86",
    "\uD83E\uDD89", "\uD83D\uDC3A", "\uD83D\uDC17", "\uD83D\uDC34", "\uD83E\uDD84",
    "\uD83D\uDC1D", "\uD83D\uDC1B", "\uD83E\uDD8B", "\uD83D\uDC0C", "\uD83D\uDC1E"
)

val FOOD = listOf(
    "\uD83C\uDF4E", "\uD83C\uDF4A", "\uD83C\uDF4B", "\uD83C\uDF4C", "\uD83C\uDF49",
    "\uD83C\uDF47", "\uD83C\uDF53", "\uD83C\uDF48", "\uD83C\uDF51", "\uD83C\uDF52",
    "\uD83C\uDF45", "\uD83C\uDF36\uFE0F", "\uD83C\uDF3D", "\uD83E\uDD55", "\uD83E\uDD54",
    "\uD83C\uDF55", "\uD83C\uDF54", "\uD83C\uDF2E", "\uD83C\uDF2F", "\uD83C\uDF73",
    "\uD83C\uDF5E", "\uD83E\uDD50", "\uD83E\uDD5E", "\uD83C\uDF5F", "\uD83C\uDF57",
    "\uD83C\uDF56", "\uD83C\uDF63", "\uD83C\uDF5C", "\uD83C\uDF72", "\uD83E\uDD58"
)

val ACTIVITIES = listOf(
    "\u26BD", "\uD83C\uDFC0", "\uD83C\uDFC8", "\u26BE", "\uD83E\uDD4E",
    "\uD83C\uDFBE", "\uD83C\uDFD0", "\uD83C\uDFC9", "\uD83E\uDD4F", "\uD83C\uDFB1",
    "\uD83C\uDFD3", "\uD83C\uDFF8", "\uD83E\uDD4A", "\uD83E\uDD4B", "\u26F3",
    "\uD83C\uDFC7", "\uD83C\uDFAF", "\u26F8\uFE0F", "\uD83C\uDFA3", "\uD83E\uDD3F",
    "\uD83C\uDFBD", "\uD83C\uDFC4", "\uD83C\uDFC6", "\uD83E\uDD47", "\uD83E\uDD48",
    "\uD83E\uDD49", "\uD83C\uDFAE", "\uD83C\uDFB2", "\uD83C\uDFB0", "\uD83C\uDFAD"
)

val OBJECTS = listOf(
    "\uD83D\uDCF1", "\uD83D\uDCBB", "\uD83D\uDCBE", "\uD83D\uDCF7", "\uD83D\uDCF9",
    "\uD83D\uDCFA", "\uD83D\uDCFB", "\u23F0", "\u231A", "\uD83D\uDCA1",
    "\uD83D\uDD0B", "\uD83D\uDD0C", "\uD83D\uDCE7", "\u2709\uFE0F", "\uD83D\uDCE6",
    "\uD83D\uDCDD", "\uD83D\uDCC4", "\uD83D\uDCD6", "\uD83D\uDCD3", "\uD83D\uDCDA",
    "\uD83D\uDD11", "\uD83D\uDD10", "\uD83D\uDD12", "\uD83D\uDD13", "\uD83D\uDEE0\uFE0F",
    "\u2694\uFE0F", "\uD83D\uDD2B", "\uD83D\uDEA8", "\uD83D\uDEAA", "\uD83D\uDEB2"
)

val SYMBOLS = listOf(
    "\u2764\uFE0F", "\uD83E\uDDE1", "\uD83D\uDC9B", "\uD83D\uDC9A", "\uD83D\uDC99",
    "\uD83D\uDC9C", "\uD83D\uDDA4", "\uD83E\uDD0D", "\uD83E\uDD0E", "\uD83D\uDC94",
    "\u2763\uFE0F", "\uD83D\uDC95", "\uD83D\uDC9E", "\uD83D\uDC93", "\uD83D\uDC97",
    "\uD83D\uDC96", "\uD83D\uDC98", "\uD83D\uDC9D", "\u2B50", "\uD83C\uDF1F",
    "\uD83D\uDCAF", "\u2714\uFE0F", "\u274C", "\u2753", "\u2757",
    "\uD83D\uDCA4", "\uD83D\uDCA2", "\uD83D\uDCAC", "\uD83D\uDC40", "\uD83D\uDE4F"
)
