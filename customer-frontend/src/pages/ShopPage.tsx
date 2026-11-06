import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, ChevronDown, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import api from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { Product, Category } from '../types';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Active query parameters
  const currentCategory = searchParams.get('category') || '';
  const currentSubcategory = searchParams.get('subcategory') || '';
  const currentKeyword = searchParams.get('keyword') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentSize = searchParams.get('size') || '';
  const currentColor = searchParams.get('color') || '';
  const currentInStock = searchParams.get('inStock') === 'true';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36', 'Standard'];
  const popularColors = ['Wine Red', 'Royal Navy', 'Chalk White', 'Plum Purple', 'Emerald Green', 'Cognac Tan', 'Midnight Black'];

  // Fetch categories list
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success) {
          setCategories(res.data.tree || res.data.categories);
        }
      } catch (err) {
        console.warn('Could not load categories');
      }
    };
    fetchCats();
  }, []);

  // Fetch filtered products
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams(searchParams);
        queryParams.set('limit', '12');

        const res = await api.get(`/products?${queryParams.toString()}`);
        if (res.data.success) {
          setProducts(res.data.products);
          setTotalProducts(res.data.totalProducts);
          setTotalPages(res.data.totalPages);
        }
      } catch (err) {
        console.error('Error fetching products', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredProducts();
  }, [searchParams]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (!value) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.set('page', '1'); // reset page on filter change
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900">
            {currentKeyword ? `Search results for "${currentKeyword}"` : 'All Collections'}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Showing {products.length} of {totalProducts} curated pieces
          </p>
        </div>

        {/* Sorting Dropdown & Mobile Filter Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 hidden sm:inline">Sort by:</span>
            <select
              value={currentSort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="px-3 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="newest">Newest First</option>
              <option value="popularity">Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block space-y-6 pr-4">
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <h3 className="font-semibold text-sm text-stone-800 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#832729]" /> Refine By
            </h3>
            <button
              onClick={clearAllFilters}
              className="text-xs text-[#832729] hover:underline font-medium"
            >
              Clear All
            </button>
          </div>

          {/* Categories Filter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3">
              Categories
            </h4>
            <div className="space-y-1.5 text-sm">
              <button
                onClick={() => {
                  updateParam('category', '');
                  updateParam('subcategory', '');
                }}
                className={`w-full text-left py-1 text-xs font-semibold ${
                  !currentCategory ? 'text-[#832729]' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <div key={cat._id} className="space-y-1">
                  <button
                    onClick={() => {
                      updateParam('category', cat._id);
                      updateParam('subcategory', '');
                    }}
                    className={`w-full text-left py-1 text-xs font-semibold ${
                      currentCategory === cat._id ? 'text-[#832729]' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                  {currentCategory === cat._id && cat.subcategories && (
                    <div className="pl-3 space-y-1 border-l-2 border-[#832729]/30">
                      {cat.subcategories.map((sub) => (
                        <button
                          key={sub._id}
                          onClick={() => updateParam('subcategory', sub._id)}
                          className={`w-full text-left py-0.5 text-xs ${
                            currentSubcategory === sub._id ? 'text-[#832729] font-bold' : 'text-stone-500 hover:text-stone-800'
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3">
              Price Range
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={currentMinPrice}
                onChange={(e) => updateParam('minPrice', e.target.value)}
                className="w-1/2 px-3 py-1.5 border border-stone-300 rounded text-xs"
              />
              <span className="text-stone-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={currentMaxPrice}
                onChange={(e) => updateParam('maxPrice', e.target.value)}
                className="w-1/2 px-3 py-1.5 border border-stone-300 rounded text-xs"
              />
            </div>
          </div>

          {/* Size Filter */}
          <div className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3">
              Size
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {availableSizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => updateParam('size', currentSize === sz ? '' : sz)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    currentSize === sz
                      ? 'bg-[#832729] text-white border-[#832729]'
                      : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter */}
          <div className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3">
              Color
            </h4>
            <div className="space-y-1.5 text-xs">
              {popularColors.map((col) => (
                <button
                  key={col}
                  onClick={() => updateParam('color', currentColor === col ? '' : col)}
                  className={`w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-stone-50 ${
                    currentColor === col ? 'font-bold text-[#832729]' : 'text-stone-600'
                  }`}
                >
                  <span>{col}</span>
                  {currentColor === col && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Stock Filter */}
          <div className="pt-4 border-t border-stone-200">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentInStock}
                onChange={(e) => updateParam('inStock', e.target.checked ? 'true' : '')}
                className="rounded text-[#832729] focus:ring-[#832729]"
              />
              In Stock Only
            </label>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="aspect-[3/4] bg-stone-200 rounded-xl" />
                  <div className="h-4 bg-stone-200 rounded w-3/4" />
                  <div className="h-4 bg-stone-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-stone-50 rounded-2xl p-8">
              <h3 className="font-serif text-xl font-semibold text-stone-800 mb-2">
                No matching garments found
              </h3>
              <p className="text-sm text-stone-500 mb-6">
                Try loosening your filters or searching for another keyword.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-6 py-2.5 bg-[#832729] text-white text-xs uppercase font-bold tracking-wider rounded-lg"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => updateParam('page', pageNum.toString())}
                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-[#832729] text-white shadow-md'
                        : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
