import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, RefreshCw, Truck, Heart } from 'lucide-react';
import api from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { Banner, Category, Product } from '../types';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const HomePage: React.FC = () => {
  const { settings } = useStoreSettings();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [bannerRes, catRes, featRes, newRes] = await Promise.all([
          api.get('/banners?position=HERO'),
          api.get('/categories'),
          api.get('/products?featured=true&limit=4'),
          api.get('/products?newArrivals=true&limit=4')
        ]);

        if (bannerRes.data.success) setBanners(bannerRes.data.banners);
        if (catRes.data.success) setCategories(catRes.data.tree || catRes.data.categories);
        if (featRes.data.success) setFeaturedProducts(featRes.data.products);
        if (newRes.data.success) setNewArrivals(newRes.data.products);
      } catch (err) {
        console.warn('Error loading homepage content', err);
      }
    };

    loadHomeData();
  }, []);

  // Auto rotate hero banners if multiple
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[activeHeroIndex] || {
    title: 'Curated Elegance & Modern Clothing',
    subtitle: 'Discover refined silhouettes, bespoke fabrics and festive collections.',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    linkUrl: '/shop',
    buttonText: 'Explore Collections'
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Dynamic Hero Banner Carousel */}
      <section className="relative h-[75vh] min-h-[500px] max-h-[750px] overflow-hidden bg-stone-900">
        <div className="absolute inset-0">
          <img
            src={currentBanner.imageUrl}
            alt={currentBanner.title}
            className="w-full h-full object-cover object-center filter brightness-[0.75] transition-all duration-1000 scale-100 hover:scale-105"
          />
        </div>

        {/* Hero Content Overlay */}
        <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-start text-white">
          <div className="max-w-2xl space-y-4 animate-fadeIn">
            <span className="inline-block py-1 px-3 bg-[#D4AF37]/90 text-stone-900 text-xs font-bold uppercase tracking-widest rounded">
              Bengaluru Haute Couture
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {currentBanner.title}
            </h1>
            <p className="text-stone-200 text-sm sm:text-base leading-relaxed max-w-xl">
              {currentBanner.subtitle}
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link
                to={currentBanner.linkUrl || '/shop'}
                className="px-8 py-3.5 bg-[#832729] text-white font-semibold text-xs uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all flex items-center gap-2 shadow-xl shadow-[#832729]/30"
              >
                {currentBanner.buttonText || 'Shop Collection'} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/shop?newArrivals=true"
                className="px-8 py-3.5 bg-white/20 backdrop-blur-md text-white font-semibold text-xs uppercase tracking-widest rounded-lg hover:bg-white/30 transition-all"
              >
                New Arrivals
              </Link>
            </div>
          </div>
        </div>

        {/* Carousel indicators */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveHeroIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === activeHeroIndex ? 'w-8 bg-[#D4AF37]' : 'w-2 bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. Shop By Dynamic Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#832729]">
            Curated Wardrobe
          </p>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900">
            Shop by Category
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.slice(0, 4).map((cat) => (
            <Link
              key={cat._id}
              to={`/shop?category=${cat._id}`}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
            >
              <img
                src={
                  cat.image?.url ||
                  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80'
                }
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.85]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                <h3 className="font-serif text-lg sm:text-xl font-bold">{cat.name}</h3>
                <p className="text-xs text-stone-300 mt-1 flex items-center gap-1 group-hover:text-[#D4AF37] transition-colors">
                  Explore Collection <ArrowRight className="w-3 h-3" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Highlight Products */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#832729]">
                Handpicked Favorites
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                Featured Highlights
              </h2>
            </div>
            <Link
              to="/shop?featured=true"
              className="text-xs font-bold uppercase tracking-wider text-[#832729] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Promotional Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#832729] to-[#461416] text-white p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="inline-block px-3 py-1 bg-[#D4AF37] text-stone-900 text-xs font-bold uppercase tracking-wider rounded-md">
              Special Offer
            </span>
            <h3 className="font-serif text-2xl sm:text-4xl font-bold">
              Festive Elegance: Extra 10% Off
            </h3>
            <p className="text-stone-200 text-sm">
              Use code <span className="font-mono font-bold text-[#D4AF37]">AURA10</span> at checkout on orders over ₹1,499. Hand-tailored in Bengaluru with express door delivery.
            </p>
          </div>
          <Link
            to="/shop"
            className="px-8 py-3.5 bg-white text-[#832729] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-stone-100 transition-all shrink-0 shadow-lg"
          >
            Claim Your Discount
          </Link>
        </div>
      </section>

      {/* 5. New Season Arrivals */}
      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#832729]">
                Fresh Off The Loom
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                New Season Arrivals
              </h2>
            </div>
            <Link
              to="/shop?newArrivals=true"
              className="text-xs font-bold uppercase tracking-wider text-[#832729] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {newArrivals.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
