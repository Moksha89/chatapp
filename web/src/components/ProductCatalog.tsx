import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
  Plus, Trash2, Edit2, Package, Eye, EyeOff, Share2, Copy,
  ExternalLink, ChevronLeft, ChevronRight, Search,
  DollarSign, Tag, Image, Star, TrendingUp, ShoppingCart
} from 'lucide-react';

interface Product {
  id: string;
  userId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrls: string[];
  category: string;
  isAvailable: boolean;
  link: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductCatalogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'Electronics', 'Clothing & Fashion', 'Food & Beverages', 'Home & Garden',
  'Health & Beauty', 'Sports & Fitness', 'Toys & Games', 'Books & Media',
  'Automotive', 'Services', 'Digital Products', 'Other',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'BRL', 'KRW'];

export function ProductCatalog({ isOpen, onClose }: ProductCatalogProps) {
  useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [formData, setFormData] = useState({
    name: '', description: '', price: '', currency: 'USD',
    category: 'Other', link: '', imageUrl: '', imageUrl2: '', imageUrl3: '',
  });

  useEffect(() => {
    if (isOpen) { loadProducts(); }
  }, [isOpen]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const productList = await api.getProducts();
      setProducts(productList);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', currency: 'USD', category: 'Other', link: '', imageUrl: '', imageUrl2: '', imageUrl3: '' });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, description: product.description || '',
      price: product.price.toString(), currency: product.currency,
      category: product.category || 'Other', link: product.link || '',
      imageUrl: product.imageUrls?.[0] || '', imageUrl2: product.imageUrls?.[1] || '',
      imageUrl3: product.imageUrls?.[2] || '',
    });
    setShowForm(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim() || !formData.price) return;
    setIsSaving(true);
    try {
      const imageUrls = [formData.imageUrl, formData.imageUrl2, formData.imageUrl3].filter(Boolean);
      const productData = {
        name: formData.name, description: formData.description,
        price: parseFloat(formData.price), currency: formData.currency,
        category: formData.category, link: formData.link || null, imageUrls,
      };
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, productData);
      } else {
        await api.createProduct(productData);
      }
      resetForm();
      loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api.deleteProduct(productId);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleToggleAvailability = async (productId: string) => {
    try {
      await api.toggleProductAvailability(productId);
      loadProducts();
    } catch (error) {
      console.error('Failed to toggle:', error);
    }
  };

  const shareProduct = (product: Product) => {
    const link = product.link || `${window.location.origin}/product/${product.id}`;
    navigator.clipboard.writeText(`${product.name} - ${product.currency} ${product.price.toFixed(2)}\n${link}`);
    alert('Product link copied to clipboard!');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: products.length,
    available: products.filter(p => p.isAvailable).length,
    categories: new Set(products.map(p => p.category)).size,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#246BFD]" />
            Product Catalog
          </DialogTitle>
          <DialogDescription>Manage your products and services</DialogDescription>
        </DialogHeader>

        {/* Product Detail View */}
        {selectedProduct && (
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <button onClick={() => { setSelectedProduct(null); setCurrentImageIndex(0); }} className="flex items-center gap-1 text-sm text-[#246BFD] mb-3 hover:underline">
              <ChevronLeft className="w-4 h-4" /> Back to catalog
            </button>
            {/* Image Carousel */}
            {selectedProduct.imageUrls?.length > 0 && (
              <div className="relative mb-4">
                <img src={selectedProduct.imageUrls[currentImageIndex]} alt={selectedProduct.name} className="w-full h-48 object-cover rounded-xl" />
                {selectedProduct.imageUrls.length > 1 && (
                  <>
                    <button onClick={() => setCurrentImageIndex(i => (i - 1 + selectedProduct.imageUrls.length) % selectedProduct.imageUrls.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 rounded-full text-white hover:bg-black/60">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentImageIndex(i => (i + 1) % selectedProduct.imageUrls.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 rounded-full text-white hover:bg-black/60">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {selectedProduct.imageUrls.map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <h3 className="text-lg font-bold text-gray-900">{selectedProduct.name}</h3>
            <p className="text-2xl font-bold text-[#246BFD] mt-1">{selectedProduct.currency} {selectedProduct.price.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${selectedProduct.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {selectedProduct.isAvailable ? 'In Stock' : 'Out of Stock'}
              </span>
              {selectedProduct.category && <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px] text-gray-600">{selectedProduct.category}</span>}
            </div>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{selectedProduct.description}</p>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={() => shareProduct(selectedProduct)}>
                <Share2 className="w-4 h-4 mr-2" /> Share Product
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => handleEditProduct(selectedProduct)}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Form View */}
        {showForm && !selectedProduct && (
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
                <Package className="w-3.5 h-3.5 text-[#246BFD]" /> Product Name *
              </label>
              <Input placeholder="Product name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
                <Star className="w-3.5 h-3.5 text-[#246BFD]" /> Description
              </label>
              <Textarea placeholder="Product description..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="rounded-xl min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#246BFD]" /> Price *
                </label>
                <Input type="number" placeholder="0.00" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Currency</label>
                <select className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
                <Tag className="w-3.5 h-3.5 text-[#246BFD]" /> Category
              </label>
              <select className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Image URLs */}
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
                <Image className="w-3.5 h-3.5 text-[#246BFD]" /> Product Images (up to 3)
              </label>
              <div className="space-y-2">
                <Input placeholder="Image URL 1" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="rounded-xl text-sm" />
                <Input placeholder="Image URL 2 (optional)" value={formData.imageUrl2} onChange={(e) => setFormData({ ...formData, imageUrl2: e.target.value })} className="rounded-xl text-sm" />
                <Input placeholder="Image URL 3 (optional)" value={formData.imageUrl3} onChange={(e) => setFormData({ ...formData, imageUrl3: e.target.value })} className="rounded-xl text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
                <ExternalLink className="w-3.5 h-3.5 text-[#246BFD]" /> Product Link (optional)
              </label>
              <Input placeholder="https://..." value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} className="rounded-xl" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={resetForm}>Cancel</Button>
              <Button className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={handleSaveProduct} disabled={isSaving || !formData.name.trim() || !formData.price}>
                {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </div>
        )}

        {/* List View */}
        {!showForm && !selectedProduct && (
          <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
            {/* Stats bar */}
            <div className="flex gap-2 mb-3">
              {[
                { label: 'Products', value: stats.total, icon: Package, color: 'blue' },
                { label: 'Available', value: stats.available, icon: TrendingUp, color: 'green' },
                { label: 'Categories', value: stats.categories, icon: Tag, color: 'purple' },
              ].map(s => (
                <div key={s.label} className={`flex-1 p-2.5 rounded-xl bg-${s.color === 'blue' ? '[#246BFD]' : s.color === 'green' ? 'green-500' : 'purple-500'}/5 text-center`}>
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-xl text-sm" />
              </div>
              <select className="px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">All</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <Button className="w-full mb-3 bg-[#246BFD] hover:bg-[#1A56DB] text-white rounded-xl" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#246BFD]" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">{searchQuery ? 'No matching products' : 'No products yet'}</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                {filteredProducts.map(product => (
                  <div key={product.id} className={`rounded-xl border hover:border-[#246BFD]/30 transition-colors cursor-pointer ${!product.isAvailable ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedProduct(product)}>
                    {product.imageUrls?.[0] ? (
                      <img src={product.imageUrls[0]} alt={product.name} className="w-full h-28 object-cover rounded-t-xl" />
                    ) : (
                      <div className="w-full h-28 bg-gray-100 rounded-t-xl flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-300" />
                      </div>
                    )}
                    <div className="p-2.5">
                      <h4 className="text-sm font-medium truncate">{product.name}</h4>
                      <p className="text-xs text-[#246BFD] font-bold mt-0.5">{product.currency} {product.price.toFixed(2)}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        {product.category && <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">{product.category}</span>}
                        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleToggleAvailability(product.id)} className="p-1 hover:bg-gray-100 rounded" title={product.isAvailable ? 'Mark unavailable' : 'Mark available'}>
                            {product.isAvailable ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-gray-400" />}
                          </button>
                          <button onClick={() => shareProduct(product)} className="p-1 hover:bg-gray-100 rounded"><Share2 className="h-3.5 w-3.5 text-[#246BFD]" /></button>
                          <button onClick={() => handleEditProduct(product)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="h-3.5 w-3.5 text-blue-500" /></button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Catalog share link */}
            {products.length > 0 && (
              <div className="mt-4 p-3 bg-[#246BFD]/5 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Share2 className="w-4 h-4 text-[#246BFD]" />
                  <p className="text-xs font-medium text-gray-700">Share Entire Catalog</p>
                </div>
                <div className="flex gap-2">
                  <Input value={`${window.location.origin}/catalog`} readOnly className="flex-1 text-[11px] rounded-xl bg-white" />
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/catalog`); alert('Catalog link copied!'); }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
