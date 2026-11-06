import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { Product, ProductVariant, CartItem, GuestCartItem } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  subtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => Promise<void>;
  updateQuantity: (itemIdOrVariantId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemIdOrVariantId: string) => Promise<void>;
  clearCart: () => void;
  loading: boolean;
  coupon: { code: string; discountAmount: number } | null;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

const GUEST_CART_STORAGE_KEY = 'aura_guest_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discountAmount: number } | null>(null);

  // Helper to load guest cart from localStorage
  const getGuestCartFromStorage = (): GuestCartItem[] => {
    try {
      const data = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  // Helper to save guest cart to localStorage
  const saveGuestCartToStorage = (items: GuestCartItem[]) => {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
  };

  // Validate and hydrate guest cart with latest server prices and stock
  const hydrateGuestCart = async (guestItems: GuestCartItem[]) => {
    if (guestItems.length === 0) {
      setCartItems([]);
      return;
    }

    try {
      const res = await api.post('/cart/guest/validate', {
        items: guestItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity
        }))
      });

      if (res.data.success) {
        setCartItems(res.data.items);
      }
    } catch (err) {
      console.warn('Failed to hydrate guest cart', err);
    }
  };

  // Fetch logged-in user's cart from backend
  const fetchCustomerCart = async () => {
    try {
      setLoading(true);
      const res = await api.get('/cart');
      if (res.data?.success && res.data.cart) {
        setCartItems(res.data.cart.items || []);
        if (res.data.cart.coupon?.code) {
          setCoupon(res.data.cart.coupon);
        }
      }
    } catch (err) {
      console.warn('Failed to load user cart', err);
    } finally {
      setLoading(false);
    }
  };

  // Merge guest cart when customer logs in
  useEffect(() => {
    const handleAuthChange = async () => {
      if (isAuthenticated) {
        const guestItems = getGuestCartFromStorage();
        if (guestItems.length > 0) {
          try {
            // Merge guest cart with user cart on backend
            const res = await api.post('/cart/merge', {
              guestItems: guestItems.map((g) => ({
                variantId: g.variantId,
                quantity: g.quantity
              }))
            });

            if (res.data?.success && res.data.cart) {
              setCartItems(res.data.cart.items || []);
              // Clear guest cart from localStorage after successful merge
              localStorage.removeItem(GUEST_CART_STORAGE_KEY);
            }
          } catch (mergeErr) {
            console.error('Error merging guest cart:', mergeErr);
            await fetchCustomerCart();
          }
        } else {
          await fetchCustomerCart();
        }
      } else {
        // Guest mode: load and hydrate from localStorage
        const guestItems = getGuestCartFromStorage();
        await hydrateGuestCart(guestItems);
      }
    };

    handleAuthChange();
  }, [isAuthenticated, user?.id]);

  // Add product to cart
  const addToCart = async (product: Product, variant: ProductVariant, quantity = 1) => {
    if (variant.stockQuantity < quantity) {
      throw new Error(`Only ${variant.stockQuantity} items available in stock`);
    }

    if (isAuthenticated) {
      const res = await api.post('/cart/items', {
        variantId: variant._id,
        quantity
      });
      if (res.data.success) {
        setCartItems(res.data.cart.items);
      }
    } else {
      // Guest shopping in localStorage
      const guestItems = getGuestCartFromStorage();
      const existingIndex = guestItems.findIndex((item) => item.variantId === variant._id);

      const unitPrice =
        (product.discountPrice !== null && product.discountPrice !== undefined
          ? product.discountPrice
          : product.basePrice) + (variant.additionalPrice || 0);

      const primaryImg = product.images.find((i) => i.isPrimary)?.url || product.images[0]?.url || '';

      if (existingIndex > -1) {
        const newQty = guestItems[existingIndex].quantity + quantity;
        if (newQty > variant.stockQuantity) {
          throw new Error(`Cannot add more. Limit of ${variant.stockQuantity} reached in cart.`);
        }
        guestItems[existingIndex].quantity = newQty;
      } else {
        guestItems.push({
          variantId: variant._id,
          productId: product._id,
          productName: product.name,
          productImage: primaryImg,
          size: variant.size,
          color: variant.color,
          price: unitPrice,
          quantity
        });
      }

      saveGuestCartToStorage(guestItems);
      await hydrateGuestCart(guestItems);
    }

    setIsCartOpen(true);
  };

  // Update item quantity
  const updateQuantity = async (targetId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(targetId);
      return;
    }

    if (isAuthenticated) {
      const res = await api.put(`/cart/items/${targetId}`, { quantity });
      if (res.data.success) {
        setCartItems(res.data.cart.items);
      }
    } else {
      const guestItems = getGuestCartFromStorage();
      const item = guestItems.find((i) => i.variantId === targetId);
      if (item) {
        item.quantity = quantity;
        saveGuestCartToStorage(guestItems);
        await hydrateGuestCart(guestItems);
      }
    }
  };

  // Remove item from cart
  const removeFromCart = async (targetId: string) => {
    if (isAuthenticated) {
      const res = await api.delete(`/cart/items/${targetId}`);
      if (res.data.success) {
        setCartItems(res.data.cart.items);
      }
    } else {
      const guestItems = getGuestCartFromStorage().filter((i) => i.variantId !== targetId);
      saveGuestCartToStorage(guestItems);
      await hydrateGuestCart(guestItems);
    }
  };

  const clearCart = () => {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    setCartItems([]);
    setCoupon(null);
  };

  const applyCoupon = async (code: string) => {
    const currentSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const res = await api.post('/coupons/validate', {
      code,
      cartTotal: currentSubtotal
    });

    if (res.data.success) {
      setCoupon({
        code: res.data.coupon.code,
        discountAmount: res.data.coupon.discountAmount
      });
    } else {
      throw new Error(res.data.message || 'Invalid coupon');
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        subtotal,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        loading,
        coupon,
        applyCoupon,
        removeCoupon,
        refreshCart: isAuthenticated ? fetchCustomerCart : () => hydrateGuestCart(getGuestCartFromStorage())
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
