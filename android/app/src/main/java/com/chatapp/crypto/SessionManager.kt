package com.chatapp.crypto

import android.content.Context
import android.util.Base64
import org.json.JSONObject

class SessionManager(private val context: Context) {
    
    private val cryptoManager = CryptoManager(context)
    private val sharedPrefs = context.getSharedPreferences("session_store", Context.MODE_PRIVATE)
    
    suspend fun initialize(): Boolean {
        return try {
            var identityKeyPair = cryptoManager.getIdentityKeyPair()
            if (identityKeyPair == null) {
                identityKeyPair = cryptoManager.generateIdentityKeyPair()
            }
            
            var signedPreKey = cryptoManager.getSignedPreKey()
            if (signedPreKey == null) {
                val keyId = getNextKeyId()
                signedPreKey = cryptoManager.generateSignedPreKey(identityKeyPair.privateKey, keyId)
            }
            
            val oneTimePreKeyCount = getOneTimePreKeyCount()
            if (oneTimePreKeyCount < 10) {
                val startKeyId = getNextKeyId()
                cryptoManager.generateOneTimePreKeys(startKeyId, 20)
            }
            
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
    
    fun getPublicKeysForUpload(): KeysForUpload? {
        val identityKeyPair = cryptoManager.getIdentityKeyPair() ?: return null
        val signedPreKey = cryptoManager.getSignedPreKey() ?: return null
        
        val oneTimePreKeys = mutableListOf<OneTimePreKeyPublic>()
        for (keyId in 1..100) {
            val otpk = cryptoManager.getOneTimePreKey(keyId)
            if (otpk != null) {
                oneTimePreKeys.add(OneTimePreKeyPublic(otpk.keyId, otpk.toBase64PublicKey()))
            }
        }
        
        return KeysForUpload(
            identityKey = identityKeyPair.toBase64PublicKey(),
            signedPreKey = SignedPreKeyPublic(
                keyId = signedPreKey.keyId,
                publicKey = signedPreKey.toBase64PublicKey(),
                signature = signedPreKey.toBase64Signature()
            ),
            oneTimePreKeys = oneTimePreKeys
        )
    }
    
    fun hasSession(recipientId: String, deviceId: String): Boolean {
        return sharedPrefs.contains(getSessionKey(recipientId, deviceId))
    }
    
    suspend fun createSession(
        recipientId: String,
        deviceId: String,
        keyBundle: PublicKeyBundle
    ): Boolean {
        return try {
            val sessionData = JSONObject().apply {
                put("recipientId", recipientId)
                put("deviceId", deviceId)
                put("identityKey", Base64.encodeToString(keyBundle.identityKey, Base64.NO_WRAP))
                put("createdAt", System.currentTimeMillis())
            }
            
            sharedPrefs.edit()
                .putString(getSessionKey(recipientId, deviceId), sessionData.toString())
                .apply()
            
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
    
    suspend fun encryptMessage(
        recipientId: String,
        deviceId: String,
        plaintext: String
    ): EncryptedMessage? {
        return try {
            if (!hasSession(recipientId, deviceId)) {
                return null
            }
            
            val sessionKey = getSessionEncryptionKey(recipientId, deviceId)
            val encrypted = cryptoManager.encrypt(plaintext.toByteArray(), sessionKey)
            
            EncryptedMessage(
                ciphertext = encrypted.toBase64Ciphertext(),
                nonce = encrypted.toBase64Nonce()
            )
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    suspend fun decryptMessage(
        senderId: String,
        senderDeviceId: String,
        ciphertext: String,
        nonce: String
    ): String? {
        return try {
            if (!hasSession(senderId, senderDeviceId)) {
                return null
            }
            
            val sessionKey = getSessionEncryptionKey(senderId, senderDeviceId)
            val encryptedData = CryptoManager.EncryptedData(
                Base64.decode(ciphertext, Base64.NO_WRAP),
                Base64.decode(nonce, Base64.NO_WRAP)
            )
            
            String(cryptoManager.decrypt(encryptedData, sessionKey))
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    fun deleteSession(recipientId: String, deviceId: String) {
        sharedPrefs.edit()
            .remove(getSessionKey(recipientId, deviceId))
            .apply()
    }
    
    fun clearAllSessions() {
        sharedPrefs.edit().clear().apply()
        cryptoManager.clearAllKeys()
    }
    
    private fun getSessionKey(recipientId: String, deviceId: String): String {
        return "session_${recipientId}_${deviceId}"
    }
    
    private fun getSessionEncryptionKey(recipientId: String, deviceId: String): ByteArray {
        return ByteArray(32) { 0 }
    }
    
    private fun getNextKeyId(): Int {
        val currentId = sharedPrefs.getInt("next_key_id", 1)
        sharedPrefs.edit().putInt("next_key_id", currentId + 1).apply()
        return currentId
    }
    
    private fun getOneTimePreKeyCount(): Int {
        var count = 0
        for (keyId in 1..100) {
            if (cryptoManager.getOneTimePreKey(keyId) != null) {
                count++
            }
        }
        return count
    }
    
    data class KeysForUpload(
        val identityKey: String,
        val signedPreKey: SignedPreKeyPublic,
        val oneTimePreKeys: List<OneTimePreKeyPublic>
    )
    
    data class SignedPreKeyPublic(
        val keyId: Int,
        val publicKey: String,
        val signature: String
    )
    
    data class OneTimePreKeyPublic(
        val keyId: Int,
        val publicKey: String
    )
    
    data class EncryptedMessage(
        val ciphertext: String,
        val nonce: String
    )
}
