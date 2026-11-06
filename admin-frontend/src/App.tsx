import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminLayout } from './components/AdminLayout';

import { AdminLoginPage } from './pages/AdminLoginPage';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { ProductManagementPage } from './pages/ProductManagementPage';
import { InventoryManagementPage } from './pages/InventoryManagementPage';
import { CategoryManagementPage } from './pages/CategoryManagementPage';
import { OrderManagementPage } from './pages/OrderManagementPage';
import { CustomerManagementPage } from './pages/CustomerManagementPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { StoreSettingsPage } from './pages/StoreSettingsPage';
import { ReportsPage } from './pages/ReportsPage';

const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">
        Verifying Administrative Credentials...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <AdminAuthProvider>
        <Routes>
          {/* Public Admin Login Route */}
          <Route path="/login" element={<AdminLoginPage />} />

          {/* Protected Administrative Console */}
          <Route
            path="/"
            element={
              <ProtectedAdminRoute>
                <DashboardOverviewPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedAdminRoute>
                <ProductManagementPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedAdminRoute>
                <InventoryManagementPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedAdminRoute>
                <CategoryManagementPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedAdminRoute>
                <OrderManagementPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedAdminRoute>
                <CustomerManagementPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/promotions"
            element={
              <ProtectedAdminRoute>
                <PromotionsPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedAdminRoute>
                <StoreSettingsPage />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedAdminRoute>
                <ReportsPage />
              </ProtectedAdminRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </Router>
  );
};

export default App;
