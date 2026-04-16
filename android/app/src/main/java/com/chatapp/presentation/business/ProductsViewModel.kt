package com.chatapp.presentation.business

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chatapp.data.api.ApiService
import com.chatapp.data.api.dto.CreateProductRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductUiItem(
    val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val currency: String,
    val inStock: Boolean
)

data class ProductsUiState(
    val products: List<ProductUiItem> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ProductsViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductsUiState())
    val uiState: StateFlow<ProductsUiState> = _uiState.asStateFlow()

    fun loadProducts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val products = apiService.getProducts()
                _uiState.update {
                    it.copy(
                        products = products.map { p ->
                            ProductUiItem(p.id, p.name, p.description ?: "", p.price, p.currency ?: "USD", p.inStock)
                        },
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun addProduct(name: String, description: String, price: Double) {
        viewModelScope.launch {
            try {
                apiService.createProduct(CreateProductRequest(name = name, description = description, price = price))
                loadProducts()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun deleteProduct(id: String) {
        viewModelScope.launch {
            try {
                apiService.deleteProduct(id)
                loadProducts()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
}
