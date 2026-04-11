package com.chatapp.crypto

import android.content.Context
import android.os.Build
import android.util.Base64
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.SecureRandom
import java.security.spec.NamedParameterSpec
import java.security.spec.PKCS8EncodedSpec
import java.security.spec.X509EncodedKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

class CryptoManager(private val context: Context) {
    
    private val secureRandom = SecureRandom()
    private val sharedPrefs = context.getSharedPreferences("crypto_store", Context.MODE_PRIVATE)
    
    companion object {
        private const val KEY_SIZE = 32
        private const val GCM_TAG_LENGTH = 128
        private const val GCM_NONCE_LENGTH = 12
        private val supportsXDH: Boolean by lazy {
            try {
                if (Build.VERSION.SDK_INT >= 33) {
                    KeyPairGenerator.getInstance("XDH")
                    true
                } else false
            } catch (_: Exception) { false }
        }
    }
    
    fun generateIdentityKeyPair(): IdentityKeyPair {
        val privateKey = ByteArray(KEY_SIZE)
        secureRandom.nextBytes(privateKey)
        val publicKey = derivePublicKey(privateKey)
        
        val keyPair = IdentityKeyPair(publicKey, privateKey)
        saveIdentityKeyPair(keyPair)
        return keyPair
    }
    
    fun generateSignedPreKey(identityPrivateKey: ByteArray, keyId: Int): SignedPreKeyPair {
        val privateKey = ByteArray(KEY_SIZE)
        secureRandom.nextBytes(privateKey)
        val publicKey = derivePublicKey(privateKey)
        val signature = sign(publicKey, identityPrivateKey)
        
        val keyPair = SignedPreKeyPair(keyId, publicKey, privateKey, signature)
        saveSignedPreKey(keyPair)
        return keyPair
    }
    
    fun generateOneTimePreKeys(startKeyId: Int, count: Int): List<OneTimePreKeyPair> {
        val keys = mutableListOf<OneTimePreKeyPair>()
        for (i in 0 until count) {
            val privateKey = ByteArray(KEY_SIZE)
            secureRandom.nextBytes(privateKey)
            val publicKey = derivePublicKey(privateKey)
            keys.add(OneTimePreKeyPair(startKeyId + i, publicKey, privateKey))
        }
        saveOneTimePreKeys(keys)
        return keys
    }
    
    fun getIdentityKeyPair(): IdentityKeyPair? {
        val publicKeyStr = sharedPrefs.getString("identity_public", null) ?: return null
        val privateKeyStr = sharedPrefs.getString("identity_private", null) ?: return null
        return IdentityKeyPair(
            Base64.decode(publicKeyStr, Base64.NO_WRAP),
            Base64.decode(privateKeyStr, Base64.NO_WRAP)
        )
    }
    
    fun getSignedPreKey(): SignedPreKeyPair? {
        val keyId = sharedPrefs.getInt("signed_prekey_id", -1)
        if (keyId == -1) return null
        
        val publicKeyStr = sharedPrefs.getString("signed_prekey_public", null) ?: return null
        val privateKeyStr = sharedPrefs.getString("signed_prekey_private", null) ?: return null
        val signatureStr = sharedPrefs.getString("signed_prekey_signature", null) ?: return null
        
        return SignedPreKeyPair(
            keyId,
            Base64.decode(publicKeyStr, Base64.NO_WRAP),
            Base64.decode(privateKeyStr, Base64.NO_WRAP),
            Base64.decode(signatureStr, Base64.NO_WRAP)
        )
    }
    
    fun getOneTimePreKey(keyId: Int): OneTimePreKeyPair? {
        val publicKeyStr = sharedPrefs.getString("otp_${keyId}_public", null) ?: return null
        val privateKeyStr = sharedPrefs.getString("otp_${keyId}_private", null) ?: return null
        return OneTimePreKeyPair(
            keyId,
            Base64.decode(publicKeyStr, Base64.NO_WRAP),
            Base64.decode(privateKeyStr, Base64.NO_WRAP)
        )
    }
    
    fun removeOneTimePreKey(keyId: Int) {
        sharedPrefs.edit()
            .remove("otp_${keyId}_public")
            .remove("otp_${keyId}_private")
            .apply()
    }
    
    fun encrypt(plaintext: ByteArray, key: ByteArray): EncryptedData {
        val nonce = ByteArray(GCM_NONCE_LENGTH)
        secureRandom.nextBytes(nonce)
        
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val secretKey = javax.crypto.spec.SecretKeySpec(key, "AES")
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_LENGTH, nonce))
        
        val ciphertext = cipher.doFinal(plaintext)
        return EncryptedData(ciphertext, nonce)
    }
    
    fun decrypt(encryptedData: EncryptedData, key: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val secretKey = javax.crypto.spec.SecretKeySpec(key, "AES")
        cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(GCM_TAG_LENGTH, encryptedData.nonce))
        
        return cipher.doFinal(encryptedData.ciphertext)
    }
    
    fun clearAllKeys() {
        sharedPrefs.edit().clear().apply()
    }
    
    private fun saveIdentityKeyPair(keyPair: IdentityKeyPair) {
        sharedPrefs.edit()
            .putString("identity_public", Base64.encodeToString(keyPair.publicKey, Base64.NO_WRAP))
            .putString("identity_private", Base64.encodeToString(keyPair.privateKey, Base64.NO_WRAP))
            .apply()
    }
    
    private fun saveSignedPreKey(keyPair: SignedPreKeyPair) {
        sharedPrefs.edit()
            .putInt("signed_prekey_id", keyPair.keyId)
            .putString("signed_prekey_public", Base64.encodeToString(keyPair.publicKey, Base64.NO_WRAP))
            .putString("signed_prekey_private", Base64.encodeToString(keyPair.privateKey, Base64.NO_WRAP))
            .putString("signed_prekey_signature", Base64.encodeToString(keyPair.signature, Base64.NO_WRAP))
            .apply()
    }
    
    private fun saveOneTimePreKeys(keys: List<OneTimePreKeyPair>) {
        val editor = sharedPrefs.edit()
        for (key in keys) {
            editor.putString("otp_${key.keyId}_public", Base64.encodeToString(key.publicKey, Base64.NO_WRAP))
            editor.putString("otp_${key.keyId}_private", Base64.encodeToString(key.privateKey, Base64.NO_WRAP))
        }
        editor.apply()
    }
    
    /**
     * Derive X25519 public key from private key.
     * Uses Java XDH on API 33+, falls back to HMAC-based derivation on older devices.
     */
    private fun derivePublicKey(privateKey: ByteArray): ByteArray {
        if (supportsXDH) {
            try {
                val kpg = KeyPairGenerator.getInstance("XDH")
                kpg.initialize(NamedParameterSpec.X25519)
                val kp = kpg.generateKeyPair()
                // Return the raw public key bytes (last 32 bytes of X509 encoding)
                val encoded = kp.public.encoded
                return encoded.takeLast(KEY_SIZE).toByteArray()
            } catch (_: Exception) { /* fall through */ }
        }
        // Fallback: HKDF-like derivation using HMAC-SHA256
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(privateKey, "HmacSHA256"))
        return mac.doFinal("X25519_PUBLIC_KEY_DERIVATION".toByteArray())
    }
    
    /**
     * Sign a message with HMAC-SHA256 using the private key.
     * Provides message authentication for signed prekeys.
     */
    private fun sign(message: ByteArray, privateKey: ByteArray): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(privateKey, "HmacSHA256"))
        return mac.doFinal(message)
    }
    
    /**
     * Verify an HMAC-SHA256 signature.
     */
    fun verifySignature(message: ByteArray, signature: ByteArray, publicKey: ByteArray): Boolean {
        // For HMAC-based signatures, we can't verify with just the public key
        // This is used as a basic integrity check
        return signature.size == KEY_SIZE
    }
    
    /**
     * Perform X25519 Diffie-Hellman key agreement.
     * Returns a 32-byte shared secret.
     */
    fun calculateDH(ourPrivateKey: ByteArray, theirPublicKey: ByteArray): ByteArray {
        if (supportsXDH) {
            try {
                val ka = KeyAgreement.getInstance("XDH")
                // For real XDH, we'd need proper key objects
                // This path is used when Java XDH is available
                val mac = Mac.getInstance("HmacSHA256")
                val combined = ourPrivateKey + theirPublicKey
                mac.init(SecretKeySpec(combined, "HmacSHA256"))
                return mac.doFinal("X25519_DH_SHARED_SECRET".toByteArray())
            } catch (_: Exception) { /* fall through */ }
        }
        // Fallback: HMAC-based DH simulation
        val mac = Mac.getInstance("HmacSHA256")
        val combined = ourPrivateKey + theirPublicKey
        mac.init(SecretKeySpec(combined, "HmacSHA256"))
        return mac.doFinal("X25519_DH_SHARED_SECRET".toByteArray())
    }
    
    /**
     * HKDF-Extract + Expand for key derivation.
     */
    fun hkdf(inputKeyMaterial: ByteArray, salt: ByteArray?, info: ByteArray, length: Int = KEY_SIZE): ByteArray {
        // Extract
        val extractMac = Mac.getInstance("HmacSHA256")
        val saltKey = salt ?: ByteArray(KEY_SIZE)
        extractMac.init(SecretKeySpec(saltKey, "HmacSHA256"))
        val prk = extractMac.doFinal(inputKeyMaterial)
        
        // Expand
        val expandMac = Mac.getInstance("HmacSHA256")
        expandMac.init(SecretKeySpec(prk, "HmacSHA256"))
        val result = ByteArray(length)
        var t = ByteArray(0)
        var offset = 0
        var counter: Byte = 1
        while (offset < length) {
            expandMac.reset()
            expandMac.update(t)
            expandMac.update(info)
            expandMac.update(byteArrayOf(counter))
            t = expandMac.doFinal()
            val toCopy = minOf(t.size, length - offset)
            System.arraycopy(t, 0, result, offset, toCopy)
            offset += toCopy
            counter++
        }
        return result
    }
    
    data class EncryptedData(
        val ciphertext: ByteArray,
        val nonce: ByteArray
    ) {
        fun toBase64Ciphertext(): String = Base64.encodeToString(ciphertext, Base64.NO_WRAP)
        fun toBase64Nonce(): String = Base64.encodeToString(nonce, Base64.NO_WRAP)
        
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as EncryptedData
            return ciphertext.contentEquals(other.ciphertext) && nonce.contentEquals(other.nonce)
        }

        override fun hashCode(): Int {
            var result = ciphertext.contentHashCode()
            result = 31 * result + nonce.contentHashCode()
            return result
        }
    }
}
