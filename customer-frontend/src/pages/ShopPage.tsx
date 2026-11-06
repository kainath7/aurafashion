import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Filter,
  X,
  ChevronDown,
  Check,
  RotateCcw,
  Star,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import api from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { Product, FilterMetadata } from '../types';
import { getSocket } from '../services/socket';

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Products and filter metadata state
  const [products, setProducts] = useState<Product[]>([]);
  const [filterMeta, setFilterMeta] = useState<FilterMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Active dropdown menu for desktop top toolbar
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mobile drawer states
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string>('category');

  // Temporary local state for price range filter inside dropdown
  const [priceMinInput, setPriceMinInput] = useState<string>('');
  const [priceMaxInput, setPriceMaxInput] = useState<string>('');

  // Extract query parameters from URL
  const currentCategory = searchParams.get('category') || '';
  const currentSubcategory = searchParams.get('subcategory') || '';
  const currentKeyword = searchParams.get('keyword') || '';
  const currentSort = searchParams.get('sort') || 'featured';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentRating = searchParams.get('rating') || '';
  const currentDiscount = searchParams.get('discount') || '';
  const currentInStock = searchParams.get('inStock') === 'true';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Multi-select parameter helpers (comma-delimited)
  const getParamArray = (key: string): string[] => {
    const val = searchParams.get(key);
    if (!val) return [];
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const currentBrands = useMemo(() => getParamArray('brand'), [searchParams]);
  const currentFabrics = useMemo(() => getParamArray('fabric'), [searchParams]);
  const currentSizes = useMemo(() => getParamArray('size'), [searchParams]);
  const currentColors = useMemo(() => getParamArray('color'), [searchParams]);

  // Sync local price inputs when query param changes
  useEffect(() => {
    setPriceMinInput(currentMinPrice);
    setPriceMaxInput(currentMaxPrice);
  }, [currentMinPrice, currentMaxPrice]);

  // Click outside listener to close open dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Fetch dynamic filter metadata from MongoDB
  const fetchFilterMetadata = async () => {
    try {
      setMetaLoading(true);
      const params = new URLSearchParams();
      if (currentCategory) params.set('category', currentCategory);
      if (currentKeyword) params.set('keyword', currentKeyword);

      const res = await api.get(`/products/filters?${params.toString()}`);
      if (res.data.success && res.data.filters) {
        setFilterMeta(res.data.filters);
      }
    } catch (err) {
      console.warn('[FilterMeta] Failed to load dynamic filter options', err);
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterMetadata();
  }, [currentCategory, currentKeyword]);

  // Fetch filtered products from MongoDB API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(searchParams);
      if (!queryParams.has('limit')) {
        queryParams.set('limit', '12');
      }

      const res = await api.get(`/products?${queryParams.toString()}`);
      if (res.data.success) {
        setProducts(res.data.products);
        setTotalProducts(res.data.totalProducts);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error('[Products] Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  // Real-time synchronization with Admin dashboard updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const handleProductChange = () => {
      fetchProducts();
      fetchFilterMetadata();
    };

    const handleInventoryChange = () => {
      fetchProducts();
    };

    socket.on('product_created', handleProductChange);
    socket.on('product_updated', handleProductChange);
    socket.on('product_deleted', handleProductChange);
    socket.on('category_created', handleProductChange);
    socket.on('category_updated', handleProductChange);
    socket.on('category_deleted', handleProductChange);
    socket.on('inventory_updated', handleInventoryChange);

    return () => {
      socket.off('product_created', handleProductChange);
      socket.off('product_updated', handleProductChange);
      socket.off('product_deleted', handleProductChange);
      socket.off('category_created', handleProductChange);
      socket.off('category_updated', handleProductChange);
      socket.off('category_deleted', handleProductChange);
      socket.off('inventory_updated', handleInventoryChange);
    };
  }, [currentCategory, currentKeyword]);

  // Helper: Toggle multiple values in a comma-separated query parameter
  const toggleMultiValue = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    const existing = getParamArray(key);
    let updated: string[];

    if (existing.includes(value)) {
      updated = existing.filter((item) => item !== value);
    } else {
      updated = [...existing, value];
    }

    if (updated.length > 0) {
      newParams.set(key, updated.join(','));
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Helper: Set or delete single query parameter
  const setSingleParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === '' || value === undefined) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Helper: Clear single specific value from a multi or single parameter
  const removeSpecificFilter = (key: string, valueToRemove?: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (!valueToRemove) {
      newParams.delete(key);
    } else {
      const existing = getParamArray(key);
      const filtered = existing.filter((v) => v !== valueToRemove);
      if (filtered.length > 0) {
        newParams.set(key, filtered.join(','));
      } else {
        newParams.delete(key);
      }
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Clear all filters except search keyword
  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    if (currentKeyword) {
      newParams.set('keyword', currentKeyword);
    }
    setSearchParams(newParams);
  };

  // Count active filter conditions
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (currentCategory) count += 1;
    if (currentSubcategory) count += 1;
    if (currentBrands.length > 0) count += currentBrands.length;
    if (currentFabrics.length > 0) count += currentFabrics.length;
    if (currentSizes.length > 0) count += currentSizes.length;
    if (currentColors.length > 0) count += currentColors.length;
    if (currentMinPrice || currentMaxPrice) count += 1;
    if (currentRating) count += 1;
    if (currentDiscount) count += 1;
    if (currentInStock) count += 1;

    // Dynamic specification parameters
    for (const [k, v] of searchParams.entries()) {
      if (k.startsWith('spec_') && v) {
        count += v.split(',').length;
      }
    }
    return count;
  }, [
    currentCategory,
    currentSubcategory,
    currentBrands,
    currentFabrics,
    currentSizes,
    currentColors,
    currentMinPrice,
    currentMaxPrice,
    currentRating,
    currentDiscount,
    currentInStock,
    searchParams
  ]);

  // Apply custom price range
  const handleApplyPrice = () => {
    const newParams = new URLSearchParams(searchParams);
    if (priceMinInput) newParams.set('minPrice', priceMinInput);
    else newParams.delete('minPrice');

    if (priceMaxInput) newParams.set('maxPrice', priceMaxInput);
    else newParams.delete('maxPrice');

    newParams.set('page', '1');
    setSearchParams(newParams);
    setActiveDropdown(null);
  };

  // Dynamic specifications list from metadata
  const dynamicSpecs = filterMeta?.specifications || [];

  return (
    <div className="bg-[#FAF9F6] min-h-screen">
      {/* 1. Header & Breadcrumbs Section */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-stone-500 uppercase tracking-widest mb-1.5">
                <span>Shop</span>
                <span>/</span>
                <span className="text-[#832729]">
                  {currentCategory
                    ? filterMeta?.categories.find((c) => c._id === currentCategory || c.slug === currentCategory)?.name || 'Category'
                    : 'All Collections'}
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
                {currentKeyword ? `Results for "${currentKeyword}"` : 'All Collections'}
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Explore handpicked luxury ethnic wear, kurtis, silk sarees, and contemporary apparel.
              </p>
            </div>

            {/* Mobile Filter & Sort Triggers */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-300 rounded-full text-xs font-semibold text-stone-800 shadow-sm active:bg-stone-50"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#832729]" />
                <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
              </button>
              <button
                onClick={() => setMobileSortOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-stone-300 rounded-full text-xs font-semibold text-stone-800 shadow-sm active:bg-stone-50"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#832729]" />
                <span>Sort</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compact Horizontal Filter Toolbar (DESKTOP) */}
      <section className="bg-white border-b border-stone-200 sticky top-16 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div ref={dropdownRef} className="hidden sm:flex items-center gap-2 flex-wrap relative">
            {/* Filter Icon Label */}
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500 mr-1">
              <Filter className="w-3.5 h-3.5 text-[#832729]" />
              <span>Filter By:</span>
            </div>

            {/* A. CATEGORIES DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  currentCategory
                    ? 'bg-[#832729]/10 border-[#832729] text-[#832729] font-semibold'
                    : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                }`}
              >
                <span>
                  {currentCategory
                    ? filterMeta?.categories.find((c) => c._id === currentCategory || c.slug === currentCategory)?.name || 'Category'
                    : 'Categories'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'category' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'category' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Select Category</span>
                    {currentCategory && (
                      <button
                        onClick={() => {
                          setSingleParam('category', null);
                          setSingleParam('subcategory', null);
                          setActiveDropdown(null);
                        }}
                        className="text-[11px] text-[#832729] hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    <button
                      onClick={() => {
                        setSingleParam('category', null);
                        setSingleParam('subcategory', null);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                        !currentCategory ? 'bg-[#832729]/10 text-[#832729] font-bold' : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span>All Categories</span>
                      {!currentCategory && <Check className="w-3.5 h-3.5 text-[#832729]" />}
                    </button>
                    {filterMeta?.categories.map((cat) => (
                      <div key={cat._id} className="space-y-0.5">
                        <button
                          onClick={() => {
                            setSingleParam('category', cat.slug || cat._id);
                            setSingleParam('subcategory', null);
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                            currentCategory === cat._id || currentCategory === cat.slug
                              ? 'bg-[#832729]/10 text-[#832729] font-bold'
                              : 'text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <span>{cat.name}</span>
                          <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                            {cat.productCount}
                          </span>
                        </button>
                        {/* Subcategories */}
                        {cat.subcategories && cat.subcategories.length > 0 && (
                          <div className="pl-4 space-y-0.5">
                            {cat.subcategories.map((sub) => (
                              <button
                                key={sub._id}
                                onClick={() => {
                                  setSingleParam('category', cat.slug || cat._id);
                                  setSingleParam('subcategory', sub.slug || sub._id);
                                  setActiveDropdown(null);
                                }}
                                className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between ${
                                  currentSubcategory === sub._id || currentSubcategory === sub.slug
                                    ? 'text-[#832729] font-bold bg-[#832729]/5'
                                    : 'text-stone-500 hover:text-stone-900'
                                }`}
                              >
                                <span>{sub.name}</span>
                                {sub.productCount > 0 && (
                                  <span className="text-[9px] text-stone-400">{sub.productCount}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* B. BRAND DROPDOWN */}
            {filterMeta?.brands && filterMeta.brands.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'brand' ? null : 'brand')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    currentBrands.length > 0
                      ? 'bg-[#832729]/10 border-[#832729] text-[#832729] font-semibold'
                      : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <span>Brand {currentBrands.length > 0 ? `(${currentBrands.length})` : ''}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'brand' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'brand' && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Brand</span>
                      {currentBrands.length > 0 && (
                        <button
                          onClick={() => removeSpecificFilter('brand')}
                          className="text-[11px] text-[#832729] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {filterMeta.brands.map((b) => {
                        const isSelected = currentBrands.includes(b);
                        return (
                          <label
                            key={b}
                            onClick={() => toggleMultiValue('brand', b)}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-stone-50 select-none"
                          >
                            <span className={isSelected ? 'text-[#832729] font-bold' : 'text-stone-700'}>{b}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-stone-300 text-[#832729] focus:ring-[#832729]"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* C. SIZE DROPDOWN */}
            {filterMeta?.sizes && filterMeta.sizes.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'size' ? null : 'size')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    currentSizes.length > 0
                      ? 'bg-[#832729]/10 border-[#832729] text-[#832729] font-semibold'
                      : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <span>Size {currentSizes.length > 0 ? `(${currentSizes.length})` : ''}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'size' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'size' && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Select Sizes</span>
                      {currentSizes.length > 0 && (
                        <button
                          onClick={() => removeSpecificFilter('size')}
                          className="text-[11px] text-[#832729] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {filterMeta.sizes.map((s) => {
                        const isSelected = currentSizes.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => toggleMultiValue('size', s)}
                            className={`py-2 text-xs font-semibold rounded-lg border transition-all text-center ${
                              isSelected
                                ? 'bg-[#832729] text-white border-[#832729] shadow-sm'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-400'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* D. COLOUR DROPDOWN */}
            {filterMeta?.colors && filterMeta.colors.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'color' ? null : 'color')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    currentColors.length > 0
                      ? 'bg-[#832729]/10 border-[#832729] text-[#832729] font-semibold'
                      : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <span>Colour {currentColors.length > 0 ? `(${currentColors.length})` : ''}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'color' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'color' && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Colour Palette</span>
                      {currentColors.length > 0 && (
                        <button
                          onClick={() => removeSpecificFilter('color')}
                          className="text-[11px] text-[#832729] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {filterMeta.colors.map((c) => {
                        const isSelected = currentColors.includes(c.color);
                        return (
                          <button
                            key={c.color}
                            onClick={() => toggleMultiValue('color', c.color)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                              isSelected ? 'bg-[#832729]/10 font-bold text-[#832729]' : 'text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-4 h-4 rounded-full border border-stone-300 shadow-inner inline-block shrink-0"
                                style={{ backgroundColor: c.colorCode || '#000000' }}
                              />
                              <span>{c.color}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#832729]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* E. PRICE RANGE DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'price' ? null : 'price')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  currentMinPrice || currentMaxPrice
                    ? 'bg-[#832729]/10 border-[#832729] text-[#832729] font-semibold'
                    : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                }`}
              >
                <span>
                  {currentMinPrice || currentMaxPrice
                    ? `₹${currentMinPrice || '0'} - ₹${currentMaxPrice || 'Max'}`
                    : 'Price'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'price' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'price' && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-4 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Price Range</span>
                    {(currentMinPrice || currentMaxPrice) && (
                      <button
                        onClick={() => {
                          setSingleParam('minPrice', null);
                          setSingleParam('maxPrice', null);
                          setPriceMinInput('');
                          setPriceMaxInput('');
                          setActiveDropdown(null);
                        }}
                        className="text-[11px] text-[#832729] hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Preset quick buttons */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    <button
                      onClick={() => {
                        setPriceMinInput('0');
                        setPriceMaxInput('1000');
                      }}
                      className="text-[11px] py-1 px-2 border border-stone-200 rounded-md hover:border-stone-400 text-stone-600 bg-stone-50"
                    >
                      Under ₹1,000
                    </button>
                    <button
                      onClick={() => {
                        setPriceMinInput('1000');
                        setPriceMaxInput('2500');
                      }}
                      className="text-[11px] py-1 px-2 border border-stone-200 rounded-md hover:border-stone-400 text-stone-600 bg-stone-50"
                    >
                      ₹1,000 – ₹2,500
                    </button>
                    <button
                      onClick={() => {
                        setPriceMinInput('2500');
                        setPriceMaxInput('5000');
                      }}
                      className="text-[11px] py-1 px-2 border border-stone-200 rounded-md hover:border-stone-400 text-stone-600 bg-stone-50"
                    >
                      ₹2,500 – ₹5,000
                    </button>
                    <button
                      onClick={() => {
                        setPriceMinInput('5000');
                        setPriceMaxInput('10000');
                      }}
                      className="text-[11px] py-1 px-2 border border-stone-200 rounded-md hover:border-stone-400 text-stone-600 bg-stone-50"
                    >
                      Above ₹5,000
                    </button>
                  </div>

                  {/* Custom min/max inputs */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block mb-1">
                        Min (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={priceMinInput}
                        onChange={(e) => setPriceMinInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
                      />
                    </div>
                    <span className="text-stone-400 pt-4">—</span>
                    <div className="flex-1">
                      <label className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold block mb-1">
                        Max (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="10000"
                        value={priceMaxInput}
                        onChange={(e) => setPriceMaxInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#832729]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleApplyPrice}
                    className="w-full py-2 bg-[#832729] text-white text-xs font-semibold rounded-lg hover:bg-[#6c1f21] transition-colors"
                  >
                    Apply Price
                  </button>
                </div>
              )}
            </div>

            {/* F. FABRIC DROPDOWN */}
            {filterMeta?.fabrics && filterMeta.fabrics.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'fabric' ? null : 'fabric')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    currentFabrics.length > 0
                      ? 'bg-[#832729]/10 border-[#832729] text-[#832729] font-semibold'
                      : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <span>Fabric {currentFabrics.length > 0 ? `(${currentFabrics.length})` : ''}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'fabric' ? 'rotate-180' : ''}`} />
                </button>

                {activeDropdown === 'fabric' && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Fabric</span>
                      {currentFabrics.length > 0 && (
                        <button
                          onClick={() => removeSpecificFilter('fabric')}
                          className="text-[11px] text-[#832729] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {filterMeta.fabrics.map((f) => {
                        const isSelected = currentFabrics.includes(f);
                        return (
                          <label
                            key={f}
                            onClick={() => toggleMultiValue('fabric', f)}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-stone-50 select-none"
                          >
                            <span className={isSelected ? 'text-[#832729] font-bold' : 'text-stone-700'}>{f}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="rounded border-stone-300 text-[#832729] focus:ring-[#832729]"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* G. DYNAMIC SPECIFICATION DROPDOWNS (Occasion, Fit, Pattern, Collar, Gender) */}
            {dynamicSpecs.map((spec) => {
              const specParamKey = `spec_${spec.key.toLowerCase()}`;
              const activeValues = getParamArray(specParamKey);
              const isActive = activeValues.length > 0;

              return (
                <div key={spec.key} className="relative">
                  <button
                    onClick={() => setActiveDropdown(activeDropdown === spec.key ? null : spec.key)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isActive
                        ? 'bg-[#832729]/10 border-[#832729] text-[#832729] font-semibold'
                        : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    <span>{spec.key} {isActive ? `(${activeValues.length})` : ''}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === spec.key ? 'rotate-180' : ''}`} />
                  </button>

                  {activeDropdown === spec.key && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-800">{spec.key}</span>
                        {isActive && (
                          <button
                            onClick={() => removeSpecificFilter(specParamKey)}
                            className="text-[11px] text-[#832729] hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {spec.options.map((opt) => {
                          const isSelected = activeValues.includes(opt);
                          return (
                            <label
                              key={opt}
                              onClick={() => toggleMultiValue(specParamKey, opt)}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-stone-50 select-none"
                            >
                              <span className={isSelected ? 'text-[#832729] font-bold' : 'text-stone-700'}>{opt}</span>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="rounded border-stone-300 text-[#832729] focus:ring-[#832729]"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* H. RATINGS & DISCOUNT DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'more_offers' ? null : 'more_offers')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  currentRating || currentDiscount
                    ? 'bg-[#832729]/10 border-[#832729] text-[#832729] font-semibold'
                    : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
                }`}
              >
                <span>Offers & Ratings</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'more_offers' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'more_offers' && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="pb-2 mb-2 border-b border-stone-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Customer Ratings</span>
                    <div className="mt-2 space-y-1">
                      {[4, 3].map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setSingleParam('rating', currentRating === r.toString() ? null : r.toString());
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs ${
                            currentRating === r.toString() ? 'bg-[#832729]/10 text-[#832729] font-bold' : 'text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span>{r}★ & above</span>
                          </div>
                          {currentRating === r.toString() && <Check className="w-3.5 h-3.5 text-[#832729]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">Special Discount</span>
                    <div className="mt-2 space-y-1">
                      {[10, 20, 30, 50].map((d) => (
                        <button
                          key={d}
                          onClick={() => {
                            setSingleParam('discount', currentDiscount === d.toString() ? null : d.toString());
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs ${
                            currentDiscount === d.toString() ? 'bg-[#832729]/10 text-[#832729] font-bold' : 'text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <span>{d}% and above</span>
                          {currentDiscount === d.toString() && <Check className="w-3.5 h-3.5 text-[#832729]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* I. IN-STOCK TOGGLE PILL */}
            <button
              onClick={() => setSingleParam('inStock', currentInStock ? null : 'true')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                currentInStock
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-semibold'
                  : 'bg-white border-stone-300 text-stone-700 hover:border-stone-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${currentInStock ? 'bg-emerald-600' : 'bg-stone-300'}`} />
              <span>In Stock Only</span>
            </button>

            {/* Clear All Button */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-[#832729] hover:underline font-semibold ml-2 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. Selected Filter Chips Row */}
      {activeFiltersCount > 0 && (
        <section className="bg-white border-b border-stone-200 py-2.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mr-1">
                Active Filters:
              </span>

              {/* Category chip */}
              {currentCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#832729]/10 text-[#832729] font-medium border border-[#832729]/20">
                  <span>
                    Category: {filterMeta?.categories.find((c) => c._id === currentCategory || c.slug === currentCategory)?.name || currentCategory}
                  </span>
                  <button
                    onClick={() => {
                      setSingleParam('category', null);
                      setSingleParam('subcategory', null);
                    }}
                    className="hover:text-black focus:outline-none"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Subcategory chip */}
              {currentSubcategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-stone-100 text-stone-800 font-medium border border-stone-200">
                  <span>Subcategory: {currentSubcategory}</span>
                  <button onClick={() => setSingleParam('subcategory', null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Brands chips */}
              {currentBrands.map((b) => (
                <span key={b} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-stone-100 text-stone-800 font-medium border border-stone-200">
                  <span>Brand: {b}</span>
                  <button onClick={() => removeSpecificFilter('brand', b)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Sizes chips */}
              {currentSizes.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#832729]/10 text-[#832729] font-medium border border-[#832729]/20">
                  <span>Size: {s}</span>
                  <button onClick={() => removeSpecificFilter('size', s)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Colors chips */}
              {currentColors.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-stone-100 text-stone-800 font-medium border border-stone-200">
                  <span>Colour: {c}</span>
                  <button onClick={() => removeSpecificFilter('color', c)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Fabrics chips */}
              {currentFabrics.map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-stone-100 text-stone-800 font-medium border border-stone-200">
                  <span>Fabric: {f}</span>
                  <button onClick={() => removeSpecificFilter('fabric', f)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Price range chip */}
              {(currentMinPrice || currentMaxPrice) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-stone-100 text-stone-800 font-medium border border-stone-200">
                  <span>Price: ₹{currentMinPrice || '0'} – ₹{currentMaxPrice || 'Max'}</span>
                  <button
                    onClick={() => {
                      setSingleParam('minPrice', null);
                      setSingleParam('maxPrice', null);
                      setPriceMinInput('');
                      setPriceMaxInput('');
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Rating chip */}
              {currentRating && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-50 text-amber-900 font-medium border border-amber-200">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{currentRating}★ & above</span>
                  <button onClick={() => setSingleParam('rating', null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Discount chip */}
              {currentDiscount && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-rose-50 text-rose-900 font-medium border border-rose-200">
                  <span>{currentDiscount}%+ Discount</span>
                  <button onClick={() => setSingleParam('discount', null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* In-Stock chip */}
              {currentInStock && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                  <span>In Stock Only</span>
                  <button onClick={() => setSingleParam('inStock', null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Dynamic specs chips */}
              {Array.from(searchParams.entries()).map(([k, v]) => {
                if (!k.startsWith('spec_') || !v) return null;
                const specKey = k.replace('spec_', '');
                const capitalizedKey = specKey.charAt(0).toUpperCase() + specKey.slice(1);
                return v.split(',').map((val) => (
                  <span
                    key={`${k}-${val}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-stone-100 text-stone-800 font-medium border border-stone-200"
                  >
                    <span>{capitalizedKey}: {val}</span>
                    <button onClick={() => removeSpecificFilter(k, val)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ));
              })}

              <button
                onClick={clearAllFilters}
                className="text-xs text-[#832729] hover:underline font-semibold ml-2 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4. Product Results Count & Sorting Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-stone-600 font-medium">
            Showing <span className="font-bold text-stone-900">{products.length}</span> of{' '}
            <span className="font-bold text-stone-900">{totalProducts}</span> luxury products
          </p>

          {/* Desktop Sort Dropdown */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Sort By:
            </span>
            <select
              value={currentSort}
              onChange={(e) => setSingleParam('sort', e.target.value)}
              className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popularity">Best Selling</option>
              <option value="highest_rated">Highest Rated</option>
              <option value="biggest_discount">Biggest Discount</option>
            </select>
          </div>
        </div>
      </section>

      {/* 5. Full Width Product Grid (No Sidebar!) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border border-stone-100 p-4 space-y-4">
                <div className="aspect-[3/4] bg-stone-200 rounded-lg" />
                <div className="h-4 bg-stone-200 rounded w-3/4" />
                <div className="h-3 bg-stone-200 rounded w-1/2" />
                <div className="h-4 bg-stone-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          /* Empty Search / Filter State */
          <div className="text-center py-20 px-4 bg-white rounded-2xl border border-stone-200 shadow-sm max-w-xl mx-auto mt-6">
            <div className="w-16 h-16 bg-[#832729]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#832729]">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mb-2">
              No Matching Garments Found
            </h3>
            <p className="text-sm text-stone-500 mb-6 max-w-md mx-auto">
              We couldn't find any products matching your active filter criteria. Try adjusting your size, color, or price filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#832729] text-white text-xs font-semibold rounded-full hover:bg-[#6c1f21] shadow-md transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 pt-8 border-t border-stone-200">
            <button
              disabled={currentPage <= 1}
              onClick={() => setSingleParam('page', (currentPage - 1).toString())}
              className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setSingleParam('page', p.toString())}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${
                    currentPage === p
                      ? 'bg-[#832729] text-white shadow-sm'
                      : 'border border-stone-300 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setSingleParam('page', (currentPage + 1).toString())}
              className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* 6. MOBILE FILTER SLIDE-OVER DRAWER */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#832729]" />
                <h2 className="font-serif text-lg font-bold text-stone-900">Filters</h2>
                {activeFiltersCount > 0 && (
                  <span className="bg-[#832729]/10 text-[#832729] text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 text-stone-500 hover:text-stone-900 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Accordion Filter Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-4 space-y-4">
              {/* Category Accordion */}
              <div>
                <button
                  onClick={() =>
                    setMobileExpandedSection(mobileExpandedSection === 'category' ? '' : 'category')
                  }
                  className="w-full flex items-center justify-between py-2 text-left font-semibold text-xs uppercase tracking-wider text-stone-800"
                >
                  <span>Category</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'category' ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedSection === 'category' && (
                  <div className="pt-2 pb-1 space-y-1">
                    <button
                      onClick={() => {
                        setSingleParam('category', null);
                        setSingleParam('subcategory', null);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${
                        !currentCategory ? 'bg-[#832729] text-white font-bold' : 'text-stone-700 bg-stone-50'
                      }`}
                    >
                      All Categories
                    </button>
                    {filterMeta?.categories.map((c) => (
                      <button
                        key={c._id}
                        onClick={() => {
                          setSingleParam('category', c.slug || c._id);
                          setSingleParam('subcategory', null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          currentCategory === c._id || currentCategory === c.slug
                            ? 'bg-[#832729] text-white font-bold'
                            : 'text-stone-700 bg-stone-50'
                        }`}
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] opacity-75">({c.productCount})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sizes Accordion */}
              {filterMeta?.sizes && filterMeta.sizes.length > 0 && (
                <div className="pt-4">
                  <button
                    onClick={() =>
                      setMobileExpandedSection(mobileExpandedSection === 'size' ? '' : 'size')
                    }
                    className="w-full flex items-center justify-between py-2 text-left font-semibold text-xs uppercase tracking-wider text-stone-800"
                  >
                    <span>Sizes {currentSizes.length > 0 ? `(${currentSizes.length})` : ''}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'size' ? 'rotate-180' : ''}`} />
                  </button>
                  {mobileExpandedSection === 'size' && (
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      {filterMeta.sizes.map((s) => {
                        const isSelected = currentSizes.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => toggleMultiValue('size', s)}
                            className={`py-2 text-xs font-semibold rounded-lg border text-center ${
                              isSelected
                                ? 'bg-[#832729] text-white border-[#832729]'
                                : 'bg-stone-50 border-stone-200 text-stone-700'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Colours Accordion */}
              {filterMeta?.colors && filterMeta.colors.length > 0 && (
                <div className="pt-4">
                  <button
                    onClick={() =>
                      setMobileExpandedSection(mobileExpandedSection === 'color' ? '' : 'color')
                    }
                    className="w-full flex items-center justify-between py-2 text-left font-semibold text-xs uppercase tracking-wider text-stone-800"
                  >
                    <span>Colours {currentColors.length > 0 ? `(${currentColors.length})` : ''}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'color' ? 'rotate-180' : ''}`} />
                  </button>
                  {mobileExpandedSection === 'color' && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {filterMeta.colors.map((c) => {
                        const isSelected = currentColors.includes(c.color);
                        return (
                          <button
                            key={c.color}
                            onClick={() => toggleMultiValue('color', c.color)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left ${
                              isSelected
                                ? 'border-[#832729] bg-[#832729]/10 font-bold text-[#832729]'
                                : 'border-stone-200 bg-stone-50 text-stone-700'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-stone-300 inline-block shrink-0"
                              style={{ backgroundColor: c.colorCode || '#000000' }}
                            />
                            <span className="truncate">{c.color}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Price Range Accordion */}
              <div className="pt-4">
                <button
                  onClick={() =>
                    setMobileExpandedSection(mobileExpandedSection === 'price' ? '' : 'price')
                  }
                  className="w-full flex items-center justify-between py-2 text-left font-semibold text-xs uppercase tracking-wider text-stone-800"
                >
                  <span>Price Range</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpandedSection === 'price' ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedSection === 'price' && (
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min ₹"
                        value={priceMinInput}
                        onChange={(e) => setPriceMinInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg"
                      />
                      <span>—</span>
                      <input
                        type="number"
                        placeholder="Max ₹"
                        value={priceMaxInput}
                        onChange={(e) => setPriceMaxInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={handleApplyPrice}
                      className="w-full py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg"
                    >
                      Apply Price
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Drawer Sticky Footer */}
            <div className="p-4 border-t border-stone-200 bg-white flex items-center gap-3">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-3 text-xs font-bold text-[#832729] border border-[#832729] rounded-xl hover:bg-[#832729]/5"
              >
                Clear All
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="flex-[2] py-3 text-xs font-bold text-white bg-[#832729] rounded-xl hover:bg-[#6c1f21] shadow-lg"
              >
                Show {totalProducts} Products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MOBILE SORT BOTTOM SHEET */}
      {mobileSortOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            onClick={() => setMobileSortOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 z-10 animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 mb-4">
              <h3 className="font-serif text-lg font-bold text-stone-900">Sort Products</h3>
              <button onClick={() => setMobileSortOpen(false)}>
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Featured', value: 'featured' },
                { label: 'Newest First', value: 'newest' },
                { label: 'Price: Low to High', value: 'price_asc' },
                { label: 'Price: High to Low', value: 'price_desc' },
                { label: 'Best Selling', value: 'popularity' },
                { label: 'Highest Rated', value: 'highest_rated' },
                { label: 'Biggest Discount', value: 'biggest_discount' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSingleParam('sort', opt.value);
                    setMobileSortOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    currentSort === opt.value
                      ? 'bg-[#832729] text-white shadow-md'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {currentSort === opt.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
