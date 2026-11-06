import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, ShieldCheck, RefreshCw, Truck } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const Footer: React.FC = () => {
  const { settings } = useStoreSettings();

  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-8 border-t border-stone-800">
      {/* Brand Value Pillars */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-stone-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#832729]/20 flex items-center justify-center text-[#D4AF37]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Free Express Delivery</h4>
              <p className="text-xs text-stone-400">On all orders above ₹{settings.freeDeliveryThreshold}</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#832729]/20 flex items-center justify-center text-[#D4AF37]">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Hassle-Free Returns</h4>
              <p className="text-xs text-stone-400">7 days easy exchange and returns</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#832729]/20 flex items-center justify-center text-[#D4AF37]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white">100% Authentic Quality</h4>
              <p className="text-xs text-stone-400">Hand-curated fabrics from Bengaluru</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Shop Identity */}
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-bold tracking-widest uppercase text-white">
              {settings.shopName}
            </h3>
            <p className="text-sm text-stone-400 leading-relaxed">
              {settings.tagline}. Designed for those who value refined elegance, bespoke tailoring and timeless silhouettes.
            </p>
            <div className="pt-2">
              <p className="text-xs text-[#D4AF37] font-medium uppercase tracking-wider">
                Proprietor: {settings.ownerName}
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
              Explore Collections
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  All Collections
                </Link>
              </li>
              <li>
                <Link to="/shop?featured=true" className="hover:text-white transition-colors">
                  Featured Highlights
                </Link>
              </li>
              <li>
                <Link to="/shop?newArrivals=true" className="hover:text-white transition-colors">
                  New Season Arrivals
                </Link>
              </li>
              <li>
                <Link to="/shop?bestSellers=true" className="hover:text-white transition-colors">
                  Best Sellers
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care & Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
              Customer Care & Policies
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/policies#returns" className="hover:text-white transition-colors">
                  Return & Exchange Policy
                </Link>
              </li>
              <li>
                <Link to="/policies#refunds" className="hover:text-white transition-colors">
                  Refund Terms
                </Link>
              </li>
              <li>
                <Link to="/policies#shipping" className="hover:text-white transition-colors">
                  Shipping Information
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Customer Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
              Store & Studio
            </h4>
            <div className="flex items-start gap-3 text-sm text-stone-400">
              <MapPin className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
              <span>{settings.shopAddress}, {settings.shopLocation}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-400">
              <Phone className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <a href={`tel:${settings.contactNumber}`} className="hover:text-white">
                +91 {settings.contactNumber}
              </a>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-400">
              <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <a href={`mailto:${settings.email}`} className="hover:text-white break-all">
                {settings.email}
              </a>
            </div>
            <div className="flex items-start gap-3 text-sm text-stone-400">
              <Clock className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
              <span>{settings.businessHours}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-stone-800 text-center text-xs text-stone-500">
        <p>
          &copy; {new Date().getFullYear()} {settings.shopName}. All rights reserved. Crafted with excellence in Bengaluru, India.
        </p>
      </div>
    </footer>
  );
};
