package com.chatapp.presentation.media

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import com.chatapp.data.api.ApiService
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream

object MediaPickerHelper {

    // File size limits matching web app
    const val MAX_IMAGE_SIZE = 16L * 1024 * 1024   // 16MB
    const val MAX_VIDEO_SIZE = 64L * 1024 * 1024   // 64MB
    const val MAX_AUDIO_SIZE = 16L * 1024 * 1024   // 16MB
    const val MAX_FILE_SIZE = 100L * 1024 * 1024    // 100MB

    // Allowed MIME types per category
    val ALLOWED_IMAGE_TYPES = setOf(
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"
    )
    val ALLOWED_VIDEO_TYPES = setOf(
        "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/3gpp"
    )
    val ALLOWED_AUDIO_TYPES = setOf(
        "audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/mp4",
        "audio/x-m4a", "audio/3gpp", "audio/amr"
    )

    data class ValidationResult(
        val isValid: Boolean,
        val errorMessage: String? = null
    )

    fun validateFile(context: Context, uri: Uri, mediaType: String): ValidationResult {
        val mimeType = context.contentResolver.getType(uri) ?: return ValidationResult(false, "Cannot determine file type")
        val fileSize = getFileSize(context, uri)

        // Check file type
        val allowedTypes = when (mediaType) {
            "image" -> ALLOWED_IMAGE_TYPES
            "video" -> ALLOWED_VIDEO_TYPES
            "audio" -> ALLOWED_AUDIO_TYPES
            else -> null // allow all for generic files
        }
        if (allowedTypes != null && mimeType !in allowedTypes) {
            return ValidationResult(false, "File type $mimeType is not supported for $mediaType")
        }

        // Check file size
        val maxSize = when (mediaType) {
            "image" -> MAX_IMAGE_SIZE
            "video" -> MAX_VIDEO_SIZE
            "audio" -> MAX_AUDIO_SIZE
            else -> MAX_FILE_SIZE
        }
        if (fileSize > maxSize) {
            val maxMb = maxSize / (1024 * 1024)
            val fileMb = fileSize / (1024.0 * 1024.0)
            return ValidationResult(false, "File too large (${String.format("%.1f", fileMb)}MB). Max ${maxMb}MB for $mediaType")
        }

        return ValidationResult(true)
    }

    fun getFileSize(context: Context, uri: Uri): Long {
        return try {
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (cursor.moveToFirst() && sizeIndex >= 0) cursor.getLong(sizeIndex) else 0L
            } ?: 0L
        } catch (_: Exception) { 0L }
    }

    private const val MAX_IMAGE_DIMENSION = 1280
    private const val JPEG_QUALITY = 80
    private const val THUMBNAIL_SIZE = 200

    fun getFileFromUri(context: Context, uri: Uri): File? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return null
            val mimeType = context.contentResolver.getType(uri)
            val isImage = mimeType?.contains("image") == true
            val extension = when {
                isImage -> ".jpg"
                mimeType?.contains("video") == true -> ".mp4"
                mimeType?.contains("audio") == true -> ".mp3"
                mimeType?.contains("pdf") == true -> ".pdf"
                else -> ".bin"
            }
            val tempFile = File.createTempFile("upload_", extension, context.cacheDir)
            FileOutputStream(tempFile).use { outputStream ->
                inputStream.copyTo(outputStream)
            }
            inputStream.close()

            // Compress images before upload (WhatsApp-style)
            if (isImage && mimeType != "image/gif") {
                return compressImage(tempFile) ?: tempFile
            }
            tempFile
        } catch (e: Exception) {
            null
        }
    }

    fun compressImage(file: File): File? {
        return try {
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, options)
            val origWidth = options.outWidth
            val origHeight = options.outHeight

            // Calculate sample size for initial downsampling
            var sampleSize = 1
            while (origWidth / sampleSize > MAX_IMAGE_DIMENSION * 2 || origHeight / sampleSize > MAX_IMAGE_DIMENSION * 2) {
                sampleSize *= 2
            }

            val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sampleSize }
            val bitmap = BitmapFactory.decodeFile(file.absolutePath, decodeOptions) ?: return file

            // Scale to max dimension
            val width = bitmap.width
            val height = bitmap.height
            val scaledBitmap = if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                val scale = MAX_IMAGE_DIMENSION.toFloat() / maxOf(width, height)
                val newWidth = (width * scale).toInt()
                val newHeight = (height * scale).toInt()
                Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true).also {
                    if (it !== bitmap) bitmap.recycle()
                }
            } else {
                bitmap
            }

            // Write compressed JPEG
            val compressedFile = File.createTempFile("compressed_", ".jpg", file.parentFile)
            FileOutputStream(compressedFile).use { out ->
                scaledBitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)
            }
            scaledBitmap.recycle()

            // Delete original temp file
            file.delete()
            Log.d("MediaPickerHelper", "Compressed image: ${file.length()} -> ${compressedFile.length()} bytes")
            compressedFile
        } catch (e: Exception) {
            Log.e("MediaPickerHelper", "Image compression failed", e)
            file
        }
    }

    fun createThumbnail(context: Context, uri: Uri): Bitmap? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return null
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeStream(inputStream, null, options)
            inputStream.close()

            val sampleSize = maxOf(options.outWidth, options.outHeight) / THUMBNAIL_SIZE
            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = maxOf(1, sampleSize)
            }
            val stream2 = context.contentResolver.openInputStream(uri) ?: return null
            val bitmap = BitmapFactory.decodeStream(stream2, null, decodeOptions)
            stream2.close()

            bitmap?.let {
                val scale = THUMBNAIL_SIZE.toFloat() / maxOf(it.width, it.height)
                Bitmap.createScaledBitmap(it, (it.width * scale).toInt(), (it.height * scale).toInt(), true)
            }
        } catch (e: Exception) {
            null
        }
    }

    suspend fun uploadFile(apiService: ApiService, file: File): String? {
        return try {
            val mimeType = when {
                file.name.endsWith(".jpg") || file.name.endsWith(".jpeg") -> "image/jpeg"
                file.name.endsWith(".png") -> "image/png"
                file.name.endsWith(".gif") -> "image/gif"
                file.name.endsWith(".mp4") -> "video/mp4"
                file.name.endsWith(".mp3") -> "audio/mpeg"
                file.name.endsWith(".pdf") -> "application/pdf"
                else -> "application/octet-stream"
            }
            val requestBody = file.asRequestBody(mimeType.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", file.name, requestBody)
            val response = apiService.uploadMedia(part)
            response.url
        } catch (e: Exception) {
            null
        }
    }

    fun formatFileSize(bytes: Long): String {
        return when {
            bytes < 1024 -> "${bytes}B"
            bytes < 1024 * 1024 -> "${bytes / 1024}KB"
            else -> String.format("%.1fMB", bytes / (1024.0 * 1024.0))
        }
    }
}
