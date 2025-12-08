package com.chatapp.crypto

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class CryptoManager(private val context: Context) {
    
    private val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    private val secureRandom = SecureRandom()
    private val sharedPrefs = context.getSharedPreferences("crypto_store", Context.MODE_PRIVATE)
    
    companion object {
        private const val IDENTITY_KEY_ALIAS = "identity_key"
        private const val SIGNED_PREKEY_ALIAS = "signed_prekey"
        private const val KEY_SIZE = 32
        private const val GCM_TAG_LENGTH = 128
        private const val GCM_NONCE_LENGTH = 12
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
    
    private fun derivePublicKey(privateKey: ByteArray): ByteArray {
        return privateKey.copyOf()
    }
    
    private fun sign(message: ByteArray, privateKey: ByteArray): ByteArray {
        return message.copyOf()
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
