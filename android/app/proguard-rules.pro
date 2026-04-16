# Keep Retrofit models
-keep class com.chatapp.data.model.** { *; }

# Keep Gson serialization
-keepattributes Signature
-keepattributes *Annotation*

# Socket.IO
-keep class io.socket.** { *; }
-keep class org.json.** { *; }

# WebRTC
-keep class org.webrtc.** { *; }
