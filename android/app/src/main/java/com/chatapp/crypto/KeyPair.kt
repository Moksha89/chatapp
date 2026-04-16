package com.chatapp.crypto

import android.util.Base64

data class KeyPair(
    val publicKey: ByteArray,
    val privateKey: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as KeyPair
        return publicKey.contentEquals(other.publicKey) && privateKey.contentEquals(other.privateKey)
    }

    override fun hashCode(): Int {
        var result = publicKey.contentHashCode()
        result = 31 * result + privateKey.contentHashCode()
        return result
    }
}

data class IdentityKeyPair(
    val publicKey: ByteArray,
    val privateKey: ByteArray
) {
    fun toBase64PublicKey(): String = Base64.encodeToString(publicKey, Base64.NO_WRAP)
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as IdentityKeyPair
        return publicKey.contentEquals(other.publicKey) && privateKey.contentEquals(other.privateKey)
    }

    override fun hashCode(): Int {
        var result = publicKey.contentHashCode()
        result = 31 * result + privateKey.contentHashCode()
        return result
    }
}

data class SignedPreKeyPair(
    val keyId: Int,
    val publicKey: ByteArray,
    val privateKey: ByteArray,
    val signature: ByteArray
) {
    fun toBase64PublicKey(): String = Base64.encodeToString(publicKey, Base64.NO_WRAP)
    fun toBase64Signature(): String = Base64.encodeToString(signature, Base64.NO_WRAP)
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as SignedPreKeyPair
        return keyId == other.keyId && 
               publicKey.contentEquals(other.publicKey) && 
               privateKey.contentEquals(other.privateKey) &&
               signature.contentEquals(other.signature)
    }

    override fun hashCode(): Int {
        var result = keyId
        result = 31 * result + publicKey.contentHashCode()
        result = 31 * result + privateKey.contentHashCode()
        result = 31 * result + signature.contentHashCode()
        return result
    }
}

data class OneTimePreKeyPair(
    val keyId: Int,
    val publicKey: ByteArray,
    val privateKey: ByteArray
) {
    fun toBase64PublicKey(): String = Base64.encodeToString(publicKey, Base64.NO_WRAP)
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as OneTimePreKeyPair
        return keyId == other.keyId && 
               publicKey.contentEquals(other.publicKey) && 
               privateKey.contentEquals(other.privateKey)
    }

    override fun hashCode(): Int {
        var result = keyId
        result = 31 * result + publicKey.contentHashCode()
        result = 31 * result + privateKey.contentHashCode()
        return result
    }
}

data class PublicKeyBundle(
    val identityKey: ByteArray,
    val signedPreKey: SignedPreKey,
    val oneTimePreKey: OneTimePreKey? = null
) {
    data class SignedPreKey(
        val keyId: Int,
        val publicKey: ByteArray,
        val signature: ByteArray
    )
    
    data class OneTimePreKey(
        val keyId: Int,
        val publicKey: ByteArray
    )
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as PublicKeyBundle
        return identityKey.contentEquals(other.identityKey)
    }

    override fun hashCode(): Int = identityKey.contentHashCode()
}
