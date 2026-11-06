import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, subtotal } = useCart();
  const { settings } = useStoreSettings();

  if (!isCartOpen) return null;

  const freeShippingThreshold = settings.freeDeliveryThreshold || 1499;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountRemaining = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#832729]" />
              <h2 className="font-serif text-lg font-bold text-stone-800">
                Your Shopping Bag ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1 rounded-md text-stone-400 hover:text-stone-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="px-6 py-3 bg-stone-50 border-b border-stone-200">
            {amountRemaining === 0 ? (
              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                🎉 Congratulations! You have unlocked FREE Express Delivery!
              </p>
            ) : (
              <div>
                <p className="text-xs text-stone-600 mb-1.5">
                  Add <span className="font-bold text-[#832729]">₹{amountRemaining}</span> more for <span className="font-semibold text-stone-800">FREE Delivery</span>
                </p>
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#832729] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-stone-100">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-stone-800 mb-1">Your bag is empty</h3>
                <p className="text-xs text-stone-500 max-w-xs mb-6">
                  Explore our curated seasonal collection and add your favorite outfits.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/shop');
                  }}
                  className="px-6 py-2.5 bg-[#832729] text-white text-xs uppercase font-bold tracking-wider rounded-md hover:bg-[#6E1F21]"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const identifier = item._id || item.variant?._id;
                const img =
                  item.product?.images?.find((i) => i.isPrimary)?.url ||
                  item.product?.images?.[0]?.url ||
                  '';

                return (
                  <div key={identifier} className="pt-4 first:pt-0 flex gap-4">
                    <img
                      src={img}
                      alt={item.product?.name}
                      className="w-20 h-24 object-cover rounded-md bg-stone-100 shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-semibold text-stone-800 line-clamp-1">
                            {item.product?.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(identifier)}
                            className="text-stone-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Size: <span className="font-medium text-stone-700">{item.size}</span> &bull; Color: <span className="font-medium text-stone-700">{item.color}</span>
                        </p>
                        <p className="text-sm font-bold text-[#832729] mt-1">
                          ₹{item.price}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity Adjuster */}
                        <div className="flex items-center border border-stone-300 rounded-md">
                          <button
                            onClick={() => updateQuantity(identifier, item.quantity - 1)}
                            className="p-1 text-stone-600 hover:text-stone-900"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-semibold text-stone-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(identifier, item.quantity + 1)}
                            className="p-1 text-stone-600 hover:text-stone-900"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-semibold text-stone-800">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-stone-200 bg-stone-50 space-y-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-800">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Estimated Delivery</span>
                  <span className="text-xs font-medium text-stone-700">
                    {subtotal >= freeShippingThreshold ? 'FREE' : `₹${settings.deliveryCharge}`}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
                <span className="font-serif text-base font-bold text-stone-800">Total</span>
                <span className="font-serif text-lg font-bold text-[#832729]">
                  ₹{subtotal + (subtotal >= freeShippingThreshold ? 0 : settings.deliveryCharge)}
                </span>
              </div>

              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/checkout');
                }}
                className="w-full py-3.5 bg-[#832729] text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#832729]/20"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/cart');
                }}
                className="w-full py-2 text-stone-600 text-xs font-semibold hover:text-[#832729] text-center"
              >
                View Detailed Cart & Apply Coupon
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
