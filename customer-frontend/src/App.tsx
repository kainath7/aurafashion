import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StoreSettingsProvider } from './context/StoreSettingsContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { ProfilePage } from './pages/ProfilePage';
import { WishlistPage } from './pages/WishlistPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ContactPage } from './pages/ContactPage';

export const App: React.FC = () => {
  return (
    <Router>
      <StoreSettingsProvider>
        <AuthProvider>
          <CartProvider>
            <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-stone-900 selection:bg-[#832729] selection:text-white">
              <Navbar />
              <CartDrawer />
              <FloatingWhatsApp />

              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/product/:idOrSlug" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-success/:id" element={<OrderSuccessPage />} />
                  <Route path="/track-order" element={<OrderTrackingPage />} />
                  <Route path="/tracking" element={<OrderTrackingPage />} />
                  <Route path="/my-orders" element={<MyOrdersPage />} />
                  <Route path="/order/:id" element={<OrderDetailPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                  <Route path="/policies" element={<PoliciesPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                </Routes>
              </main>

              <Footer />
            </div>
          </CartProvider>
        </AuthProvider>
      </StoreSettingsProvider>
    </Router>
  );
};

export default App;
