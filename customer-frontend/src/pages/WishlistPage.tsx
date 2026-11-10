import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import api from '../services/api';
import { Product } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { getImageUrl, handleImageError } from '../utils/imageUrl';

export const WishlistPage: React.FC = () => {
  const { wishlistIds, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWishlistProducts = async () => {
      if (wishlistIds.length === 0) {
        if (isMounted) {
          setWishlistProducts([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const res = await api.post('/products/batch', { ids: wishlistIds });
        if (isMounted && res.data?.success && Array.isArray(res.data.products)) {
          setWishlistProducts(res.data.products);

          // Purge any stored IDs that no longer exist or are inactive
          const returnedIds = new Set(res.data.products.map((p: Product) => p._id));
          const obsoleteIds = wishlistIds.filter((id) => !returnedIds.has(id));
          obsoleteIds.forEach((id) => removeFromWishlist(id));
        }
      } catch (err) {
        console.warn('[Wishlist] Batch fetch error, falling back to individual lookup', err);
        // Fallback: fetch sequentially in case /batch is unavailable
        try {
          const fetched: Product[] = [];
          for (const id of wishlistIds) {
            try {
              const res = await api.get(`/products/${id}`);
              if (res.data?.success && res.data.product) {
                fetched.push(res.data.product);
              }
            } catch {
              // Ignore invalid/deleted items
            }
          }
          if (isMounted) {
            setWishlistProducts(fetched);
          }
        } catch {
          // Ignore
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWishlistProducts();

    return () => {
      isMounted = false;
    };
  }, [wishlistIds.length]);

  const handleQuickAdd = async (product: Product) => {
    const inStockVariant = product.variants?.find((v) => v.isActive && v.stockQuantity > 0);
    if (!inStockVariant) {
      // If no simple default variant, redirect to detail page for custom size/color selection
      return;
    }

    try {
      setAddingId(product._id);
      await addToCart(product, inStockVariant, 1);
      setIsCartOpen(true);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-200 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Curated Wishlist
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            My Saved Pieces
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            {wishlistIds.length} saved garment{wishlistIds.length === 1 ? '' : 's'} stored securely in your private guest collection.
          </p>
        </div>

        {wishlistIds.length > 0 && (
          <button
            type="button"
            onClick={clearWishlist}
            className="text-xs text-stone-500 hover:text-rose-600 font-medium inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Wishlist
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-stone-200 overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-stone-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-stone-100 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
                <div className="h-4 bg-stone-100 rounded w-1/3 pt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : wishlistIds.length === 0 || wishlistProducts.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 sm:p-16 text-center max-w-xl mx-auto shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 text-[#832729] flex items-center justify-center mx-auto shadow-inner">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-2xl font-bold text-stone-800">
              Your Wishlist is Empty
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              Explore our handcrafted collections and save your favorite garments by tapping the heart icon on any outfit. No login required.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#6E1F21] shadow-lg shadow-[#832729]/20 transition-all cursor-pointer"
            >
              Explore Collections <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Wishlist Grid */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {wishlistProducts.map((product) => {
            const rawPrimary =
              product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;
            const primaryImage = getImageUrl(rawPrimary);

            const hasDiscount =
              product.discountPrice && product.discountPrice < product.basePrice;
            const discountPercent = hasDiscount
              ? Math.round(
                  ((product.basePrice - product.discountPrice!) / product.basePrice) * 100
                )
              : 0;

            const hasInStock = product.variants?.some((v) => v.isActive && v.stockQuantity > 0);

            return (
              <div
                key={product._id}
                className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-stone-200/80 hover:shadow-xl transition-all duration-300"
              >
                {/* Image & Quick Actions */}
                <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
                  <Link to={`/product/${product.slug || product._id}`} className="block w-full h-full">
                    <img
                      src={primaryImage}
                      alt={product.name}
                      onError={handleImageError}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </Link>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromWishlist(product._id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-[#832729] shadow-md transition-all hover:scale-110 cursor-pointer"
                    title="Remove from wishlist"
                    aria-label="Remove from wishlist"
                  >
                    <Heart className="w-4 h-4 fill-[#832729] text-[#832729]" />
                  </button>

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-3 left-3 bg-[#832729] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      {discountPercent}% OFF
                    </div>
                  )}

                  {!hasInStock && (
                    <div className="absolute bottom-3 left-3 bg-stone-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs">
                      Sold Out
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-[#832729] uppercase tracking-wider block mb-1">
                      {product.category?.name || 'Aura Collection'}
                    </span>
                    <Link
                      to={`/product/${product.slug || product._id}`}
                      className="font-serif text-sm font-bold text-stone-900 hover:text-[#832729] transition-colors line-clamp-1"
                      title={product.name}
                    >
                      {product.name}
                    </Link>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="font-bold text-sm sm:text-base text-stone-900">
                        ₹{(product.discountPrice || product.basePrice).toLocaleString('en-IN')}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-stone-400 line-through">
                          ₹{product.basePrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                    {hasInStock ? (
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(product)}
                        disabled={addingId === product._id}
                        className="flex-1 py-2 px-3 bg-stone-900 hover:bg-[#832729] text-white rounded-lg text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {addingId === product._id ? 'Adding...' : 'Move to Bag'}
                      </button>
                    ) : (
                      <Link
                        to={`/product/${product.slug || product._id}`}
                        className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold tracking-wider text-center transition-colors"
                      >
                        View Piece
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => removeFromWishlist(product._id)}
                      className="p-2 border border-stone-200 text-stone-400 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
