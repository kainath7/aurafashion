import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistCount: number;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<boolean>;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => void;
  syncWithServer: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType>({} as WishlistContextType);

const GUEST_WISHLIST_KEY = 'aura_guest_wishlist';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();

  // Initialize immediately from localStorage (instant, no flash)
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(GUEST_WISHLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => typeof id === 'string' && id.trim().length > 0);
        }
      }
    } catch (err) {
      console.warn('[Wishlist] Failed to parse localStorage wishlist', err);
    }
    return [];
  });

  // Save to localStorage whenever wishlistIds change
  useEffect(() => {
    try {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlistIds));
    } catch (err) {
      console.warn('[Wishlist] Failed to save to localStorage', err);
    }
  }, [wishlistIds]);

  const isInWishlist = useCallback(
    (productId: string): boolean => {
      if (!productId) return false;
      return wishlistIds.includes(productId);
    },
    [wishlistIds]
  );

  const addToWishlist = async (productId: string): Promise<void> => {
    if (!productId) return;
    setWishlistIds((prev) => {
      if (prev.includes(productId)) return prev;
      return [...prev, productId];
    });

    // If customer is logged in, optionally notify backend in background
    if (token) {
      api.post(`/auth/wishlist/${productId}`).catch(() => {});
    }
  };

  const removeFromWishlist = async (productId: string): Promise<void> => {
    if (!productId) return;
    setWishlistIds((prev) => prev.filter((id) => id !== productId));

    if (token) {
      api.post(`/auth/wishlist/${productId}`).catch(() => {});
    }
  };

  // Immediate toggle (synchronous optimistic UI update + returns next state)
  const toggleWishlist = async (productId: string): Promise<boolean> => {
    if (!productId) return false;

    let willBeInWishlist = false;
    setWishlistIds((prev) => {
      if (prev.includes(productId)) {
        willBeInWishlist = false;
        return prev.filter((id) => id !== productId);
      } else {
        willBeInWishlist = true;
        return [...prev, productId];
      }
    });

    // Optional background sync if token exists
    if (token) {
      api.post(`/auth/wishlist/${productId}`).catch(() => {});
    }

    return willBeInWishlist;
  };

  const clearWishlist = () => {
    setWishlistIds([]);
    try {
      localStorage.removeItem(GUEST_WISHLIST_KEY);
    } catch {}
  };

  // Sync with authenticated customer account if present
  const syncWithServer = async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/wishlist');
      if (res.data?.success && Array.isArray(res.data.wishlist)) {
        const serverIds: string[] = res.data.wishlist
          .map((w: any) => (typeof w === 'string' ? w : w?._id))
          .filter(Boolean);

        setWishlistIds((prev) => Array.from(new Set([...prev, ...serverIds])));
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      syncWithServer();
    }
  }, [isAuthenticated, token]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistCount: wishlistIds.length,
        isInWishlist,
        toggleWishlist,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        syncWithServer
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
