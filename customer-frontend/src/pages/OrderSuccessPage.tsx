import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, Download, MessageCircle, ArrowRight, Package } from 'lucide-react';
import api from '../services/api';
import { Order } from '../types';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const OrderSuccessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { settings } = useStoreSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fire celebratory confetti on page load
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${id}`);
        if (res.data.success && res.data.order) {
          setOrder(res.data.order);
        }
      } catch (err) {
        console.warn('Could not load order details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  if (loading) {
    return <div className="max-w-2xl mx-auto py-24 text-center">Loading your order details...</div>;
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <h2 className="text-xl font-bold">Order not found</h2>
        <Link to="/shop" className="text-xs uppercase font-bold text-[#832729] hover:underline mt-4 inline-block">
          Return to Shop
        </Link>
      </div>
    );
  }

  // Pre-filled WhatsApp message for customer confirmation
  const whatsappMsg = encodeURIComponent(
    `Hello Kainath / Aura Fashion! I have just placed order ${order.orderNumber} for ₹${order.pricing.grandTotal}. Looking forward to the delivery at ${order.shippingAddress.city}!`
  );
  const whatsappUrl = `https://wa.me/91${settings.whatsappNumber}?text=${whatsappMsg}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20 text-center">
      {/* Success Badge */}
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mb-2">
        Thank You for Your Order!
      </h1>
      <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
        Your order has been recorded with Aura Fashion. Our studio in Bengaluru is preparing your garments.
      </p>

      {/* Order Meta Box */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2">
          <div>
            <p className="text-xs text-stone-400 uppercase font-semibold">Order Reference Number</p>
            <p className="font-serif text-xl font-bold text-stone-900">{order.orderNumber}</p>
          </div>
          <div className="sm:text-right">
            <span className="inline-block px-3 py-1 bg-[#832729]/10 text-[#832729] rounded-full text-xs font-bold uppercase tracking-wider">
              {order.orderStatus}
            </span>
          </div>
        </div>

        {/* Items Snapshot */}
        <div className="space-y-3 divide-y divide-stone-100">
          {order.items.map((item) => (
            <div key={item._id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={item.productImage}
                  alt={item.productName}
                  className="w-12 h-14 object-cover rounded bg-stone-100"
                />
                <div>
                  <p className="font-semibold text-stone-900">{item.productName}</p>
                  <p className="text-[11px] text-stone-500">
                    Size: {item.size} &bull; Color: {item.color} &bull; Qty: {item.quantity}
                  </p>
                </div>
              </div>
              <span className="font-bold text-stone-900">₹{item.subtotal}</span>
            </div>
          ))}
        </div>

        {/* Delivery Address Snapshot */}
        <div className="pt-4 border-t border-stone-100 text-xs text-stone-600">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-stone-900">Delivering To:</p>
            {order.shippingAddress.latitude && order.shippingAddress.longitude && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                📍 GPS Pin Confirmed
              </span>
            )}
          </div>
          <p>{order.shippingAddress.fullName} &bull; {order.shippingAddress.phone}</p>
          <p>
            {order.shippingAddress.houseNo}, {order.shippingAddress.street}
            {order.shippingAddress.area ? `, ${order.shippingAddress.area}` : ''}
            {order.shippingAddress.landmark ? ` (Landmark: ${order.shippingAddress.landmark})` : ''}
          </p>
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
            <span className="font-mono font-semibold">{order.shippingAddress.pincode}</span>
          </p>
        </div>

        {/* Pricing Total */}
        <div className="pt-4 border-t border-stone-100 flex justify-between items-center text-sm font-bold text-stone-900">
          <span>Grand Total Paid ({order.paymentMethod})</span>
          <span className="font-serif text-xl text-[#832729]">₹{order.pricing.grandTotal}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {/* Invoice PDF download */}
        <a
          href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/${order._id}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download Tax Invoice
        </a>

        {/* WhatsApp notify */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4 fill-white" /> WhatsApp Studio
        </a>

        <Link
          to={`/order/${order._id}`}
          className="px-6 py-3 border border-stone-300 rounded-lg text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
        >
          <Package className="w-4 h-4" /> Track Status Live
        </Link>
      </div>
    </div>
  );
};
