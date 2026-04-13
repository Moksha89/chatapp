package com.chatapp.di

import android.content.Context
import com.chatapp.BuildConfig
import com.chatapp.data.api.ApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import com.chatapp.data.auth.AuthEventBus
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideAuthInterceptor(@ApplicationContext context: Context): Interceptor {
        return Interceptor { chain ->
            val prefs = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
            val token = prefs.getString("access_token", null)
            
            val request = if (token != null) {
                chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .build()
            } else {
                chain.request()
            }
            
            chain.proceed(request)
        }
    }

    @Provides
    @Singleton
    fun provideTokenAuthenticator(@ApplicationContext context: Context): Authenticator {
        return Authenticator { _: Route?, response: Response ->
            val prefs = context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
            val refreshToken = prefs.getString("refresh_token", null)
                ?: return@Authenticator null

            // Don't retry if we already tried refreshing
            if (response.request.header("X-Retry-Auth") != null) {
                return@Authenticator null
            }

            synchronized(this) {
                try {
                    val json = JSONObject().put("refreshToken", refreshToken).toString()
                    val body = json.toRequestBody("application/json".toMediaType())
                    val refreshRequest = Request.Builder()
                        .url(BuildConfig.API_BASE_URL + "/auth/refresh")
                        .post(body)
                        .build()

                    val refreshResponse = OkHttpClient().newCall(refreshRequest).execute()
                    if (refreshResponse.isSuccessful) {
                        val responseBody = refreshResponse.body?.string()
                        val responseJson = JSONObject(responseBody ?: "")
                        val newAccessToken = responseJson.getString("accessToken")
                        val newRefreshToken = responseJson.getString("refreshToken")

                        prefs.edit()
                            .putString("access_token", newAccessToken)
                            .putString("refresh_token", newRefreshToken)
                            .apply()

                        return@Authenticator response.request.newBuilder()
                            .header("Authorization", "Bearer $newAccessToken")
                            .header("X-Retry-Auth", "true")
                            .build()
                    }
                } catch (_: Exception) {
                    // Refresh failed — clear session
                }

                prefs.edit()
                    .remove("access_token")
                    .remove("refresh_token")
                    .apply()
                // Notify the app that the session has expired so it can redirect to login
                AuthEventBus.emitSessionExpired()
                null
            }
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: Interceptor, tokenAuthenticator: Authenticator): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .authenticator(tokenAuthenticator)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL + "/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}
