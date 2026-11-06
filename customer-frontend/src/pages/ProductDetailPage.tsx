import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Heart, Shield, RefreshCw, Truck, MessageCircle, AlertCircle, Check } from 'lucide-react';
import api from '../services/api';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ProductCard } from '../components/ProductCard';

export const ProductDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { addToCart } = useCart();
  const { wishlistIds, toggleWishlist, isAuthenticated } = useAuth();
  const { settings } = useStoreSettings();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/products/${idOrSlug}`);
        if (res.data.success && res.data.product) {
          const prod: Product = res.data.product;
          setProduct(prod);

          // Select first available variant combination by default
          const activeVariants = prod.variants?.filter((v) => v.isActive) || [];
          const firstInStock = activeVariants.find((v) => v.stockQuantity > 0) || activeVariants[0];

          if (firstInStock) {
            setSelectedSize(firstInStock.size);
            setSelectedColor(firstInStock.color);
          }
        }
      } catch (err) {
        console.error('Failed to load product', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
  }, [idOrSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-[3/4] bg-stone-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-stone-200 rounded w-3/4" />
            <div className="h-6 bg-stone-200 rounded w-1/4" />
            <div className="h-24 bg-stone-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-800">Garment not found</h2>
        <Link to="/shop" className="mt-4 inline-block px-6 py-2 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase">
          Back to Shop
        </Link>
      </div>
    );
  }

  const variants = product.variants || [];

  // Get distinct sizes and colors
  const availableSizes = Array.from(new Set(variants.map((v) => v.size)));
  const availableColors = Array.from(
    new Map(variants.map((v) => [v.color, { name: v.color, code: v.colorCode }])).values()
  );

  // Find variant matching current selection
  const selectedVariant = variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  );

  const isCurrentVariantInStock = selectedVariant && selectedVariant.stockQuantity > 0;
  const currentStock = selectedVariant ? selectedVariant.stockQuantity : 0;

  const currentPrice =
    (product.discountPrice !== null && product.discountPrice !== undefined
      ? product.discountPrice
      : product.basePrice) + (selectedVariant?.additionalPrice || 0);

  const hasDiscount = product.discountPrice && product.discountPrice < product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.basePrice - product.discountPrice!) / product.basePrice) * 100)
    : 0;

  const isWishlisted = wishlistIds.includes(product._id);

  const handleAddToCart = async () => {
    setActionError('');
    if (!selectedVariant) {
      setActionError('Please select both a size and color.');
      return;
    }
    if (!isCurrentVariantInStock) {
      setActionError('Selected size and color combination is currently out of stock.');
      return;
    }

    try {
      await addToCart(product, selectedVariant, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Could not add to bag.');
    }
  };

  // WhatsApp pre-filled product inquiry
  const whatsappInquiryUrl = `https://wa.me/91${settings.whatsappNumber}?text=${encodeURIComponent(
    `Hello Aura Fashion! I am interested in "${product.name}" (SKU: ${selectedVariant?.sku || 'N/A'}, Size: ${selectedSize}, Color: ${selectedColor}). Could you share more details?`
  )}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-500 mb-8 flex items-center gap-2">
        <Link to="/" className="hover:text-stone-800">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-stone-800">Shop</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link to={`/shop?category=${product.category._id}`} className="hover:text-stone-800">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-stone-800 font-semibold truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Left: Image Gallery */}
        <div className="flex flex-col-reverse sm:flex-row gap-4">
          {/* Thumbnail Strip */}
          <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto max-h-[600px] shrink-0">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  selectedImageIndex === idx
                    ? 'border-[#832729] ring-2 ring-[#832729]/20'
                    : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <img src={img.url} alt={img.altText || product.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Main Focused Image */}
          <div className="flex-1 aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden relative shadow-lg">
            <img
              src={product.images[selectedImageIndex]?.url || product.images[0]?.url}
              alt={product.name}
              className="w-full h-full object-cover object-top"
            />
            {hasDiscount && (
              <span className="absolute top-4 left-4 bg-[#832729] text-white text-xs font-bold px-3 py-1 rounded shadow-md tracking-wider">
                {discountPercent}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Right: Product Details & Variant Selectors */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-stone-400 mb-1">
              <span>{product.brand || 'Aura Fashion Exclusive'}</span>
              <span>SKU: {selectedVariant?.sku || 'Choose Variant'}</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-snug">
              {product.name}
            </h1>
            {product.fabric && (
              <p className="text-xs text-stone-500 mt-1">Fabric: <span className="font-semibold text-stone-700">{product.fabric}</span></p>
            )}
          </div>

          {/* Price Block */}
          <div className="flex items-baseline gap-3 pb-4 border-b border-stone-200">
            <span className="font-serif text-3xl font-bold text-stone-900">
              ₹{currentPrice}
            </span>
            {hasDiscount && (
              <span className="text-base text-stone-400 line-through">
                ₹{product.basePrice}
              </span>
            )}
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded">
              Inclusive of all taxes
            </span>
          </div>

          {/* Color Selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Color: <span className="font-semibold text-stone-700 normal-case">{selectedColor}</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {availableColors.map((col) => {
                const isSelected = selectedColor === col.name;
                return (
                  <button
                    key={col.name}
                    onClick={() => {
                      setSelectedColor(col.name);
                      setActionError('');
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-[#832729] bg-[#832729]/5 text-[#832729] ring-2 ring-[#832729]/20'
                        : 'border-stone-300 text-stone-700 hover:border-stone-400'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: col.code }}
                      className="w-3.5 h-3.5 rounded-full border border-stone-300"
                    />
                    <span>{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size Selector with real-time stock indicator */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Select Size: <span className="font-semibold text-stone-700">{selectedSize}</span>
              </label>
              <span className="text-xs text-stone-400">Regular Indian Standard Fit</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {availableSizes.map((sz) => {
                const isSelected = selectedSize === sz;
                const matchVar = variants.find((v) => v.size === sz && v.color === selectedColor);
                const isOutOfStock = matchVar && matchVar.stockQuantity <= 0;

                return (
                  <button
                    key={sz}
                    disabled={isOutOfStock}
                    onClick={() => {
                      setSelectedSize(sz);
                      setActionError('');
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                      isSelected
                        ? 'bg-[#832729] text-white border-[#832729] shadow-md'
                        : isOutOfStock
                        ? 'bg-stone-100 text-stone-300 border-stone-200 cursor-not-allowed line-through'
                        : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inventory Stock Warning / Status */}
          <div className="text-xs">
            {isCurrentVariantInStock ? (
              currentStock <= 5 ? (
                <p className="text-amber-700 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Hurry, only {currentStock} pieces left in stock for {selectedColor} ({selectedSize})!
                </p>
              ) : (
                <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  In Stock & Ready for Dispatch from Bengaluru
                </p>
              )
            ) : (
              <p className="text-red-600 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                This combination is currently Out of Stock
              </p>
            )}
          </div>

          {actionError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {actionError}
            </div>
          )}

          {/* Quantity and Add to Bag */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center border border-stone-300 rounded-lg bg-white">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3.5 py-3 text-stone-600 hover:text-stone-900"
              >
                -
              </button>
              <span className="px-3 text-sm font-bold text-stone-800">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(currentStock || 1, quantity + 1))}
                className="px-3.5 py-3 text-stone-600 hover:text-stone-900"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!isCurrentVariantInStock}
              className={`flex-1 py-3.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${
                isCurrentVariantInStock
                  ? 'bg-[#832729] text-white hover:bg-[#6E1F21] shadow-[#832729]/25'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {addedSuccess ? 'Added to Bag!' : isCurrentVariantInStock ? 'Add to Bag' : 'Out of Stock'}
            </button>

            <button
              onClick={async () => {
                if (!isAuthenticated) return alert('Please sign in to save items to your wishlist');
                await toggleWishlist(product._id);
              }}
              className="p-3.5 border border-stone-300 rounded-lg hover:border-stone-400 bg-white"
              title="Add to Wishlist"
            >
              <Heart
                className={`w-5 h-5 ${
                  isWishlisted ? 'fill-[#832729] text-[#832729]' : 'text-stone-600'
                }`}
              />
            </button>
          </div>

          {/* WhatsApp Direct Enquiry Button */}
          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />
            Enquire about this outfit on WhatsApp
          </a>

          {/* Delivery & Care Badges */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-200 text-center">
            <div className="space-y-1">
              <Truck className="w-5 h-5 text-[#832729] mx-auto" />
              <p className="text-[11px] font-semibold text-stone-800">Express Shipping</p>
              <p className="text-[10px] text-stone-400">Dispatch in 24-48 hrs</p>
            </div>
            <div className="space-y-1">
              <RefreshCw className="w-5 h-5 text-[#832729] mx-auto" />
              <p className="text-[11px] font-semibold text-stone-800">7 Days Return</p>
              <p className="text-[10px] text-stone-400">Easy size exchange</p>
            </div>
            <div className="space-y-1">
              <Shield className="w-5 h-5 text-[#832729] mx-auto" />
              <p className="text-[11px] font-semibold text-stone-800">Direct From Studio</p>
              <p className="text-[10px] text-stone-400">Bengaluru, India</p>
            </div>
          </div>

          {/* Description & Specifications Accordion */}
          <div className="pt-6 border-t border-stone-200 space-y-4">
            <div>
              <h3 className="font-serif text-base font-bold text-stone-900 mb-2">Description</h3>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {product.specifications && product.specifications.length > 0 && (
              <div className="pt-4 border-t border-stone-100">
                <h3 className="font-serif text-base font-bold text-stone-900 mb-3">Garment Details</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {product.specifications.map((spec, i) => (
                    <div key={i} className="flex flex-col py-1 border-b border-stone-100">
                      <dt className="text-stone-400 uppercase font-medium">{spec.key}</dt>
                      <dd className="font-semibold text-stone-800 mt-0.5">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Outfits */}
      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <section className="mt-20 pt-12 border-t border-stone-200">
          <h2 className="font-serif text-2xl font-bold text-stone-900 mb-8 text-center sm:text-left">
            Complete the Look
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {product.relatedProducts.map((rel) => (
              <ProductCard key={rel._id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
