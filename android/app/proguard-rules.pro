# Keep data models for Gson
-keep class com.app.abhichat.data.model.** { *; }

# Socket.IO
-keep class io.socket.** { *; }
-keep class org.json.** { *; }

# LiveKit
-keep class io.livekit.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Retrofit
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
