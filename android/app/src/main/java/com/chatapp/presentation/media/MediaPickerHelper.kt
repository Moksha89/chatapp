package com.chatapp.presentation.media

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
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

    fun getFileFromUri(context: Context, uri: Uri): File? {
        return try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return null
            val mimeType = context.contentResolver.getType(uri)
            val extension = when {
                mimeType?.contains("image") == true -> ".jpg"
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
            tempFile
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
