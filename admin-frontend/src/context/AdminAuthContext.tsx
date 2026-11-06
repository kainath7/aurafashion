import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { Admin } from '../types';

interface AdminAuthContextType {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<Admin>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({} as AdminAuthContextType);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aura_admin_token'));
  const [loading, setLoading] = useState(true);

  const loadAdmin = async () => {
    const storedToken = localStorage.getItem('aura_admin_token');
    if (!storedToken) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/admin/auth/me');
      if (res.data.success && res.data.admin) {
        setAdmin(res.data.admin);
      } else {
        localStorage.removeItem('aura_admin_token');
        setToken(null);
        setAdmin(null);
      }
    } catch {
      localStorage.removeItem('aura_admin_token');
      setToken(null);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, [token]);

  const login = async (email: string, password: string): Promise<Admin> => {
    const res = await api.post('/admin/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('aura_admin_token', res.data.token);
      setToken(res.data.token);
      setAdmin(res.data.admin);
      return res.data.admin;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('aura_admin_token');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!admin,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
