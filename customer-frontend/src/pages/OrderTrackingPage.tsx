import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Home,
  AlertCircle,
  Download,
  MessageCircle,
  Phone,
  Hash,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import { Order } from '../types';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getImageUrl, handleImageError } from '../utils/imageUrl';

const statusSteps = [
  { key: 'PENDING', label: 'Order Placed', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'PACKED', label: 'Packed', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home }
];

export const OrderTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { settings } = useStoreSettings();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  // Auto-track if URL params are supplied
  useEffect(() => {
    const qOrderNumber = searchParams.get('orderNumber');
    const qPhone = searchParams.get('phone');
    if (qOrderNumber && qPhone) {
      handleTrack(qOrderNumber, qPhone);
    }
  }, [searchParams]);

  const handleTrack = async (numToSearch = orderNumber, phoneToSearch = phone) => {
    setError('');
    const cleanNum = numToSearch.trim();
    const cleanPhone = phoneToSearch.replace(/\D/g, '').slice(-10);

    if (!cleanNum) {
      setError('Please enter your Order Number (e.g. AF-...)');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter your 10-digit registered mobile number');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/orders/track', {
        orderNumber: cleanNum,
        phone: cleanPhone
      });

      if (res.data?.success && res.data?.order) {
        setOrder(res.data.order);
      } else {
        setError(res.data?.message || 'No matching order found. Please check your order number and mobile number.');
        setOrder(null);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'No order matching the provided details was found. Please ensure the order number and registered mobile number are exact.'
      );
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatusIndex = (currentStatus: string) => {
    return statusSteps.findIndex((s) => s.key === currentStatus);
  };

  const activeIndex = order ? getStepStatusIndex(order.orderStatus) : -1;

  const whatsappInquiryUrl = order
    ? `https://wa.me/91${settings.whatsappNumber}?text=${encodeURIComponent(
        `Hello Aura Fashion! I am inquiring about my order ${order.orderNumber}.`
      )}`
    : `https://wa.me/91${settings.whatsappNumber}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Title & Introduction */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#832729] bg-[#832729]/10 px-3 py-1 rounded-full">
          Live Guest Order Tracking
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Track Your Aura Fashion Order
        </h1>
        <p className="text-xs text-stone-500">
          No login needed! Enter your Order Reference Number and 10-digit mobile number to view real-time production, dispatch, and delivery status.
        </p>
      </div>

      {/* Tracking Search Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 max-w-2xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Order Number *</label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. AF-20261110-8291"
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Registered Mobile Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#832729] text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#832729]/20 cursor-pointer disabled:bg-stone-400"
          >
            {loading ? (
              <span>Locating Order Details...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Track Order</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Order Tracking Result Details */}
      {order && (
        <div className="space-y-8 animate-fadeIn">
          {/* Status Header Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-100 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Order Reference
                </span>
                <h2 className="font-serif text-2xl font-bold text-stone-900">{order.orderNumber}</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="sm:text-right">
                <span
                  className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    order.orderStatus === 'DELIVERED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : order.orderStatus === 'CANCELLED'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-[#832729]/10 text-[#832729] border border-[#832729]/20'
                  }`}
                >
                  {order.orderStatus.replace(/_/g, ' ')}
                </span>
                <p className="text-[11px] text-stone-400 mt-1">Payment: {order.paymentMethod} &bull; {order.paymentInfo?.status || 'PENDING'}</p>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            {order.orderStatus === 'CANCELLED' ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div>
                  <p className="font-bold text-sm">Order Cancelled</p>
                  <p className="mt-0.5">
                    This order was cancelled. Any debited amount will be refunded to your original payment method within 5-7 business days.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4">
                <div className="relative">
                  {/* Track Line */}
                  <div className="absolute top-5 left-6 right-6 h-0.5 bg-stone-200 -z-0">
                    <div
                      className="h-full bg-[#832729] transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, (Math.max(0, activeIndex) / (statusSteps.length - 1)) * 100))}%`
                      }}
                    />
                  </div>

                  {/* Steps */}
                  <div className="flex justify-between relative z-10">
                    {statusSteps.map((step, idx) => {
                      const isCompleted = idx <= activeIndex;
                      const isCurrent = idx === activeIndex;
                      const Icon = step.icon;

                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                              isCompleted
                                ? 'bg-[#832729] border-[#832729] text-white shadow-md'
                                : 'bg-white border-stone-300 text-stone-400'
                            } ${isCurrent ? 'ring-4 ring-[#832729]/20 scale-110' : ''}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span
                            className={`mt-2 text-[10px] sm:text-[11px] font-semibold max-w-[65px] leading-tight ${
                              isCompleted ? 'text-stone-800' : 'text-stone-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tracking Meta (AWB) */}
            {order.trackingNumber && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <p className="text-stone-400 font-semibold uppercase text-[10px]">Courier Logistics</p>
                  <p className="font-bold text-stone-800">Aura Express Logistics</p>
                </div>
                <div>
                  <p className="text-stone-400 font-semibold uppercase text-[10px]">AWB Tracking Number</p>
                  <p className="font-mono font-bold text-stone-800">{order.trackingNumber}</p>
                </div>
              </div>
            )}
          </div>

          {/* Grid: Order Items & Delivery Address */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items Ordered */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <h3 className="font-serif text-base font-bold text-stone-900 pb-3 border-b border-stone-100 flex items-center justify-between">
                <span>Items in this Order ({order.items?.length || 0})</span>
                <span className="text-xs font-normal text-stone-500">
                  Total: ₹{order.pricing?.grandTotal || 0}
                </span>
              </h3>

              <div className="space-y-4 divide-y divide-stone-100">
                {order.items?.map((item) => (
                  <div key={item._id} className="pt-4 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <img
                        src={getImageUrl(item.productImage)}
                        alt={item.productName}
                        onError={handleImageError}
                        className="w-16 h-20 object-cover rounded-lg bg-stone-100 shrink-0"
                      />
                      <div>
                        <h4 className="font-semibold text-stone-900 text-sm">{item.productName}</h4>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Size: <span className="font-medium text-stone-700">{item.size}</span> &bull; Color: <span className="font-medium text-stone-700">{item.color}</span>
                        </p>
                        <p className="text-xs font-semibold text-stone-700 mt-1">
                          ₹{item.price} &times; {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-stone-900">₹{item.subtotal}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address & Pricing Snapshot */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <h3 className="font-serif text-base font-bold text-stone-900">
                    Delivery Address
                  </h3>
                  {order.shippingAddress?.latitude && order.shippingAddress?.longitude && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      GPS Verified
                    </span>
                  )}
                </div>
                <p className="font-bold text-stone-800">{order.shippingAddress?.fullName}</p>
                <p className="text-stone-600">
                  {order.shippingAddress?.houseNo}, {order.shippingAddress?.street}
                  {order.shippingAddress?.area ? `, ${order.shippingAddress.area}` : ''}
                </p>
                {order.shippingAddress?.landmark && (
                  <p className="text-stone-400 text-[11px]">Landmark: {order.shippingAddress.landmark}</p>
                )}
                <p className="text-stone-600">
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} -{' '}
                  <span className="font-mono font-semibold">{order.shippingAddress?.pincode}</span>
                </p>
                <p className="text-stone-500 pt-1 font-medium">Contact: {order.shippingAddress?.phone}</p>
              </div>

              {/* Price Breakdown */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3 text-xs">
                <h3 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
                  Payment Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-stone-600">
                    <span>Items Total</span>
                    <span className="font-medium text-stone-900">₹{order.pricing?.itemsTotal}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery Charge</span>
                    <span className="font-medium text-stone-900">
                      {order.pricing?.deliveryCharge === 0 ? 'FREE' : `₹${order.pricing?.deliveryCharge}`}
                    </span>
                  </div>
                  {(order.pricing?.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount</span>
                      <span>-₹{order.pricing.discountAmount}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-sm font-bold text-stone-900">
                    <span>Grand Total</span>
                    <span className="font-serif text-xl text-[#832729]">₹{order.pricing?.grandTotal}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/${order._id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Tax Invoice
                </a>

                <a
                  href={whatsappInquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 fill-white" /> WhatsApp Boutique Support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
