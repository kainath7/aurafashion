import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getImageUrl, handleImageError } from '../utils/imageUrl';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, subtotal, updateQuantity, removeFromCart, coupon, applyCoupon, removeCoupon } = useCart();
  const { settings } = useStoreSettings();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const freeDeliveryThreshold = settings.freeDeliveryThreshold || 1499;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryCharge = isFreeDelivery ? 0 : settings.deliveryCharge;
  const discountAmount = coupon?.discountAmount || 0;
  const grandTotal = Math.max(0, subtotal + deliveryCharge - discountAmount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    if (!couponInput.trim()) return;

    try {
      await applyCoupon(couponInput.trim());
      setCouponSuccess(`Coupon ${couponInput.toUpperCase()} applied successfully!`);
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400 mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-stone-900 mb-2">Your Shopping Bag is Empty</h1>
        <p className="text-stone-500 text-sm max-w-md mx-auto mb-8">
          Explore our seasonal collection of Indian and modern apparel to add pieces to your bag.
        </p>
        <Link
          to="/shop"
          className="px-8 py-3.5 bg-[#832729] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all"
        >
          Explore Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-8">Shopping Bag</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items Table / List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden divide-y divide-stone-100">
            {cartItems.map((item) => {
              const id = item._id || item.variant?._id;
              const img = getImageUrl(
                item.product?.images?.find((i) => i.isPrimary)?.url ||
                item.product?.images?.[0]?.url
              );

              return (
                <div key={id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <img
                    src={img}
                    alt={item.product?.name}
                    onError={handleImageError}
                    className="w-24 h-32 object-cover rounded-lg bg-stone-100 shrink-0"
                  />

                  <div className="flex-1 space-y-1">
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      {item.product?.name}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Size: <span className="font-semibold text-stone-700">{item.size}</span> &bull; Color:{' '}
                      <span className="font-semibold text-stone-700">{item.color}</span>
                    </p>
                    <p className="text-sm font-bold text-[#832729] pt-1">
                      ₹{item.price} each
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-6 self-stretch sm:self-center justify-between sm:justify-start">
                    <div className="flex items-center border border-stone-300 rounded-lg bg-white">
                      <button
                        onClick={() => updateQuantity(id, item.quantity - 1)}
                        className="px-2.5 py-1 text-stone-600 hover:text-stone-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold text-stone-800">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(id, item.quantity + 1)}
                        className="px-2.5 py-1 text-stone-600 hover:text-stone-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-bold text-stone-900">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>

                    <button
                      onClick={() => removeFromCart(id)}
                      className="text-stone-400 hover:text-red-600 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary & Coupon Card */}
        <div className="space-y-6">
          {/* Coupon Box */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#832729]" /> Apply Discount Coupon
            </h3>

            {coupon ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {coupon.code} Applied
                  </p>
                  <p className="text-xs text-emerald-600">Savings: -₹{coupon.discountAmount}</p>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs text-red-600 font-semibold hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code (e.g. AURA10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-xs uppercase font-medium focus:ring-1 focus:ring-[#832729]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-stone-800 transition-colors"
                >
                  Apply
                </button>
              </form>
            )}

            {couponError && <p className="text-xs text-red-600">{couponError}</p>}
            {couponSuccess && <p className="text-xs text-emerald-600">{couponSuccess}</p>}
          </div>

          {/* Pricing Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900">Order Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal</span>
                <span className="font-semibold text-stone-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge</span>
                <span className="font-semibold text-stone-900">
                  {isFreeDelivery ? <span className="text-emerald-700">FREE</span> : `₹${deliveryCharge}`}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-between items-center">
              <span className="font-serif text-lg font-bold text-stone-900">Grand Total</span>
              <span className="font-serif text-2xl font-bold text-[#832729]">₹{grandTotal}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-4 bg-[#832729] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#832729]/20"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
