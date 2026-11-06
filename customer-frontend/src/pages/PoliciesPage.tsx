import React from 'react';
import { RefreshCw, ShieldCheck, Truck, HelpCircle } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const PoliciesPage: React.FC = () => {
  const { settings } = useStoreSettings();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-12">
      <div className="text-center space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#832729]">Aura Fashion Transparency</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Store Policies & Customer Care
        </h1>
        <p className="text-xs text-stone-500 max-w-lg mx-auto">
          We want you to feel confident with every garment ordered from our Bengaluru studio.
        </p>
      </div>

      <div className="space-y-8">
        {/* Returns */}
        <section id="returns" className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-900">Return Policy</h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            {settings.returnPolicy}
          </p>
        </section>

        {/* Exchanges */}
        <section id="exchange" className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-900">Exchange Policy</h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            {settings.exchangePolicy}
          </p>
        </section>

        {/* Refunds */}
        <section id="refunds" className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-900">Refund Terms</h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            {settings.refundPolicy}
          </p>
        </section>

        {/* Shipping */}
        <section id="shipping" className="bg-white rounded-2xl border border-stone-200 p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#832729]/10 text-[#832729] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-900">Shipping & Delivery</h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            All orders placed with Aura Fashion are processed and securely packed from Bengaluru, Karnataka. Standard delivery takes 3 to 5 business days across India. Orders above ₹{settings.freeDeliveryThreshold} qualify for complimentary express delivery; standard orders carry a nominal fee of ₹{settings.deliveryCharge}.
          </p>
        </section>
      </div>
    </div>
  );
};
