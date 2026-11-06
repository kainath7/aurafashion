import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, User as UserIcon, Search, Menu, X, ChevronDown, LogOut, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import api from '../services/api';
import { Category } from '../types';
import { getSocket } from '../services/socket';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, wishlistIds } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const { settings } = useStoreSettings();

  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchNavCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success) {
          setCategories(res.data.tree || []);
        }
      } catch (e) {
        console.warn('Could not load navigation categories');
      }
    };
    fetchNavCategories();

    const socket = getSocket();
    socket.on('category_created', fetchNavCategories);
    socket.on('category_updated', fetchNavCategories);
    socket.on('category_deleted', fetchNavCategories);

    return () => {
      socket.off('category_created', fetchNavCategories);
      socket.off('category_updated', fetchNavCategories);
      socket.off('category_deleted', fetchNavCategories);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchModal(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Announcement Bar */}
      <div className="bg-[#832729] text-white text-xs py-2 px-4 text-center font-medium tracking-wide flex justify-center items-center gap-2">
        <span>{settings.announcementText}</span>
        <span className="hidden sm:inline">|</span>
        <span className="hidden sm:inline">Contact: +91 {settings.contactNumber}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-700 hover:text-[#832729] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Logo & Brand Identity */}
          <div className="flex items-center">
            <Link to="/" className="flex flex-col">
              <span className="font-serif text-2xl sm:text-3xl tracking-widest uppercase font-bold text-[#832729]">
                {settings.shopName}
              </span>
              <span className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-medium">
                {settings.shopLocation.split(',')[0]} &bull; Haute Couture
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/"
              className="text-sm font-semibold tracking-wide uppercase text-stone-700 hover:text-[#832729] transition-colors"
            >
              Home
            </Link>

            <Link
              to="/shop"
              className="text-sm font-semibold tracking-wide uppercase text-stone-700 hover:text-[#832729] transition-colors"
            >
              All Collections
            </Link>

            {/* Dynamic Category Dropdown Menus */}
            {categories.slice(0, 4).map((cat) => (
              <div key={cat._id} className="relative group">
                <Link
                  to={`/shop?category=${cat._id}`}
                  className="flex items-center gap-1 text-sm font-semibold tracking-wide uppercase text-stone-700 group-hover:text-[#832729] transition-colors py-2"
                >
                  {cat.name}
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#832729] transition-transform group-hover:rotate-180" />
                  )}
                </Link>

                {cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="absolute top-full left-0 w-52 bg-white rounded-lg shadow-xl border border-stone-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link
                      to={`/shop?category=${cat._id}`}
                      className="block px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#832729] hover:bg-stone-50"
                    >
                      All {cat.name}
                    </Link>
                    {cat.subcategories.map((sub) => (
                      <Link
                        key={sub._id}
                        to={`/shop?category=${cat._id}&subcategory=${sub._id}`}
                        className="block px-4 py-2 text-sm text-stone-600 hover:text-[#832729] hover:bg-stone-50 transition-colors"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Link
              to="/contact"
              className="text-sm font-semibold tracking-wide uppercase text-stone-700 hover:text-[#832729] transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Action Icons */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Search Icon */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 text-stone-700 hover:text-[#832729] transition-colors"
              title="Search Collections"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Icon */}
            <Link
              to="/wishlist"
              className="relative p-2 text-stone-700 hover:text-[#832729] transition-colors"
              title="Saved Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistIds.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#832729] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistIds.length}
                </span>
              )}
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-stone-700 hover:text-[#832729] transition-colors"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#832729] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Customer Account / Auth Dropdown */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-1.5 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#832729]/10 text-[#832729] font-bold text-xs flex items-center justify-center">
                      {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-stone-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-xs text-stone-400">Signed in as</p>
                        <p className="text-sm font-semibold text-stone-800 truncate">{user?.name}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-[#832729]"
                      >
                        <UserIcon className="w-4 h-4" /> Profile & Addresses
                      </Link>
                      <Link
                        to="/my-orders"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-[#832729]"
                      >
                        <Package className="w-4 h-4" /> My Orders
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1 text-sm font-semibold text-[#832729] hover:underline px-2 py-1"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-stone-200 px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-stone-800 border-b border-stone-100"
          >
            Home
          </Link>
          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-stone-800 border-b border-stone-100"
          >
            All Collections
          </Link>
          {categories.map((cat) => (
            <div key={cat._id} className="py-1">
              <Link
                to={`/shop?category=${cat._id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-base font-semibold text-[#832729]"
              >
                {cat.name}
              </Link>
              {cat.subcategories && cat.subcategories.length > 0 && (
                <div className="pl-4 space-y-1">
                  {cat.subcategories.map((sub) => (
                    <Link
                      key={sub._id}
                      to={`/shop?category=${cat._id}&subcategory=${sub._id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-1 text-sm text-stone-600"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-medium text-stone-800"
          >
            Contact & WhatsApp
          </Link>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 relative">
            <button
              onClick={() => setShowSearchModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-xl font-bold text-stone-800 mb-4">Search Aura Fashion</h3>
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search kurtis, dresses, linen shirts, fabrics..."
                autoFocus
                className="flex-1 px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#832729]"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#832729] text-white font-semibold rounded-lg hover:bg-[#6E1F21] transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
