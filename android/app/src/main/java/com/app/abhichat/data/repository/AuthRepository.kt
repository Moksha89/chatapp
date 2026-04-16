package com.app.abhichat.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.app.abhichat.data.api.ApiClient
import com.app.abhichat.data.model.User
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth")

class AuthRepository(private val context: Context) {
    private val tokenKey = stringPreferencesKey("token")
    private val userIdKey = stringPreferencesKey("user_id")
    private val userPhoneKey = stringPreferencesKey("user_phone")
    private val deviceIdKey = stringPreferencesKey("device_id")

    suspend fun getToken(): String? {
        return context.dataStore.data.map { it[tokenKey] }.first()
    }

    suspend fun getDeviceId(): String {
        val existing = context.dataStore.data.map { it[deviceIdKey] }.first()
        if (existing != null) return existing

        val newId = UUID.randomUUID().toString()
        context.dataStore.edit { it[deviceIdKey] = newId }
        return newId
    }

    suspend fun saveAuth(token: String, user: User) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[userIdKey] = user.id
            prefs[userPhoneKey] = user.phone
        }
        ApiClient.setToken(token)
    }

    suspend fun getSavedUser(): User? {
        val id = context.dataStore.data.map { it[userIdKey] }.first() ?: return null
        val phone = context.dataStore.data.map { it[userPhoneKey] }.first() ?: return null
        return User(id = id, phone = phone, displayName = phone, profilePhoto = null)
    }

    suspend fun logout() {
        context.dataStore.edit { prefs ->
            prefs.remove(tokenKey)
            prefs.remove(userIdKey)
            prefs.remove(userPhoneKey)
        }
        ApiClient.setToken(null)
    }

    suspend fun initToken(): Boolean {
        val token = getToken()
        if (token != null) {
            ApiClient.setToken(token)
            return true
        }
        return false
    }
}
