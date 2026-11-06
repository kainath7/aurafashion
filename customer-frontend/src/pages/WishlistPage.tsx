import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import api from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';

export const WishlistPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchWishlist = async () => {
      try {
        const res = await api.get('/auth/wishlist');
        if (res.data.success) {
          setWishlistProducts(res.data.wishlist || []);
        }
      } catch (err) {
        console.error('Error fetching wishlist', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center px-4">
        <Heart className="w-12 h-12 text-[#832729] mx-auto mb-4" />
        <h1 className="font-serif text-3xl font-bold text-stone-900 mb-2">Saved Wishlist</h1>
        <p className="text-stone-500 text-sm mb-6">
          Please sign in to your Aura Fashion account to view and synchronize your saved pieces.
        </p>
        <Link
          to="/login"
          className="px-8 py-3 bg-[#832729] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21]"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto py-20 text-center text-xs">Loading wishlist...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-2">My Wishlist</h1>
      <p className="text-xs text-stone-500 mb-8">
        {wishlistProducts.length} saved garment{wishlistProducts.length === 1 ? '' : 's'}
      </p>

      {wishlistProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Heart className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-stone-800 mb-1">Your wishlist is empty</h3>
          <p className="text-xs text-stone-500 mb-6">Tap the heart icon on any outfit to save it for later.</p>
          <Link
            to="/shop"
            className="px-6 py-2.5 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Explore Outfits
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {wishlistProducts.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};
