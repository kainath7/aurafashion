import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, Address } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  logout: () => void;
  updateProfile: (name: string, phone: string) => Promise<void>;
  addAddress: (address: Omit<Address, '_id'>) => Promise<Address[]>;
  deleteAddress: (addressId: string) => Promise<Address[]>;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<boolean>;
  setAuthSession: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aura_customer_token'));
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  // Load user profile if token exists
  const loadUser = async () => {
    const storedToken = localStorage.getItem('aura_customer_token');
    if (!storedToken) {
      setUser(null);
      setWishlistIds([]);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data.user) {
        setUser(res.data.user);
        if (Array.isArray(res.data.user.wishlist)) {
          setWishlistIds(res.data.user.wishlist.map((w: any) => (typeof w === 'string' ? w : w._id)));
        }
      } else {
        localStorage.removeItem('aura_customer_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      localStorage.removeItem('aura_customer_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('aura_customer_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (name: string, email: string, password: string, phone?: string): Promise<User> => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    if (res.data.success) {
      localStorage.setItem('aura_customer_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('aura_customer_token');
    setToken(null);
    setUser(null);
    setWishlistIds([]);
  };

  const updateProfile = async (name: string, phone: string) => {
    const res = await api.put('/auth/profile', { name, phone });
    if (res.data.success) {
      setUser(res.data.user);
    }
  };

  const addAddress = async (address: Omit<Address, '_id'>) => {
    const res = await api.post('/auth/addresses', address);
    if (res.data.success) {
      setUser((prev) => (prev ? { ...prev, addresses: res.data.addresses } : null));
      return res.data.addresses;
    }
    throw new Error(res.data.message || 'Failed to add address');
  };

  const deleteAddress = async (addressId: string) => {
    const res = await api.delete(`/auth/addresses/${addressId}`);
    if (res.data.success) {
      setUser((prev) => (prev ? { ...prev, addresses: res.data.addresses } : null));
      return res.data.addresses;
    }
    throw new Error(res.data.message || 'Failed to delete address');
  };

  const toggleWishlist = async (productId: string): Promise<boolean> => {
    if (!token) {
      // Guest fallback: toggle in state and localStorage without throwing
      let isIn = false;
      setWishlistIds((prev) => {
        if (prev.includes(productId)) {
          isIn = false;
          return prev.filter((id) => id !== productId);
        } else {
          isIn = true;
          return [...prev, productId];
        }
      });
      return isIn;
    }
    try {
      const res = await api.post(`/auth/wishlist/${productId}`);
      if (res.data.success) {
        const isIn = res.data.isInWishlist;
        setWishlistIds((prev) => (isIn ? [...prev, productId] : prev.filter((id) => id !== productId)));
        return isIn;
      }
    } catch {
      // Fallback locally
    }
    return false;
  };

  const setAuthSession = (newToken: string, newUser: User) => {
    localStorage.setItem('aura_customer_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        addAddress,
        deleteAddress,
        wishlistIds,
        toggleWishlist,
        setAuthSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
