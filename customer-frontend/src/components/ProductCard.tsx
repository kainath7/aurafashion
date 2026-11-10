import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { getImageUrl, handleImageError } from '../utils/imageUrl';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { wishlistIds, toggleWishlist } = useAuth();
  const isWishlisted = wishlistIds.includes(product._id);

  const rawPrimary = product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url;
  const rawSecondary = product.images?.[1]?.url || rawPrimary;

  const primaryImage = getImageUrl(rawPrimary);
  const secondaryImage = getImageUrl(rawSecondary);

  const hasDiscount = product.discountPrice && product.discountPrice < product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.basePrice - product.discountPrice!) / product.basePrice) * 100)
    : 0;

  // Extract unique sizes & colors from variants
  const availableSizes = Array.from(new Set(product.variants?.map((v) => v.size) || []));
  const availableColors = Array.from(
    new Map(product.variants?.map((v) => [v.color, v.colorCode]) || []).entries()
  );

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product._id);
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-stone-100 hover:shadow-xl transition-all duration-300">
      {/* Image Container with Hover Swap */}
      <Link to={`/product/${product.slug || product._id}`} className="relative aspect-[3/4] overflow-hidden bg-stone-100">
        <img
          src={primaryImage}
          alt={product.name}
          onError={handleImageError}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
        {secondaryImage && secondaryImage !== primaryImage && (
          <img
            src={secondaryImage}
            alt={`${product.name} alternate view`}
            onError={handleImageError}
            className="absolute inset-0 w-full h-full object-cover object-top opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            loading="lazy"
          />
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-[#832729] text-white text-[11px] font-bold px-2 py-1 rounded shadow-md tracking-wider">
            {discountPercent}% OFF
          </div>
        )}

        {/* New Arrival Badge */}
        {product.isNewArrival && !hasDiscount && (
          <div className="absolute top-3 left-3 bg-[#D4AF37] text-stone-900 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
            New
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-stone-700 shadow-md transition-all hover:scale-110"
          aria-label="Save to wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-[#832729] text-[#832729]' : 'text-stone-600'
            }`}
          />
        </button>

        {/* Quick Sizes Strip on Hover */}
        {availableSizes.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm py-2 px-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-stone-700">
            <span className="text-[10px] uppercase text-stone-400 mr-1">Sizes:</span>
            {availableSizes.slice(0, 5).map((size) => (
              <span key={size} className="px-1.5 py-0.5 bg-stone-100 rounded border border-stone-200">
                {size}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Category / Brand */}
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-400 mb-1">
            <span>{product.brand || 'Aura Fashion'}</span>
            {product.category && <span>{product.category.name}</span>}
          </div>

          {/* Product Name */}
          <Link
            to={`/product/${product.slug || product._id}`}
            className="font-serif text-sm font-semibold text-stone-800 hover:text-[#832729] transition-colors line-clamp-1"
          >
            {product.name}
          </Link>
        </div>

        {/* Price & Color preview */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-stone-900 text-base">
              ₹{product.discountPrice || product.basePrice}
            </span>
            {hasDiscount && (
              <span className="text-xs text-stone-400 line-through">
                ₹{product.basePrice}
              </span>
            )}
          </div>

          {/* Available Color Dots */}
          {availableColors.length > 0 && (
            <div className="flex items-center gap-1">
              {availableColors.slice(0, 4).map(([name, code]) => (
                <span
                  key={name}
                  title={name}
                  style={{ backgroundColor: code }}
                  className="w-3 h-3 rounded-full border border-stone-300 shadow-xs"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
