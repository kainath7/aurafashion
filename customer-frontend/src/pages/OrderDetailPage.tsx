import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Download, MessageCircle, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { Order } from '../types';
import { OrderTracker } from '../components/OrderTracker';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { settings } = useStoreSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.order);
      }
    } catch (err) {
      console.error('Failed to load order', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Connect to Socket.IO for real-time order status updates
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl);

    socket.emit('track_order', id);

    socket.on('status_change', (data) => {
      if (data.orderId === id) {
        setOrder((prev) => (prev ? { ...prev, orderStatus: data.status, trackingNumber: data.trackingNumber } : null));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  const handleCancelOrder = async () => {
    setCancelLoading(true);
    try {
      const res = await api.put(`/orders/${id}/cancel`, { reason: cancelReason });
      if (res.data.success) {
        setOrder(res.data.order);
        setCancelModalOpen(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto py-20 text-center text-xs">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center">
        <h2 className="text-xl font-bold">Order not found</h2>
        <Link to="/my-orders" className="text-xs uppercase font-bold text-[#832729] hover:underline mt-4 inline-block">
          Back to Orders
        </Link>
      </div>
    );
  }

  const isCancellable = ['PENDING', 'CONFIRMED'].includes(order.orderStatus);

  const whatsappInquiryUrl = `https://wa.me/91${settings.whatsappNumber}?text=${encodeURIComponent(
    `Hello Aura Fashion! I have an inquiry regarding my order ${order.orderNumber}.`
  )}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <Link to="/my-orders" className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Order {order.orderNumber}
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#832729]/10 text-[#832729]">
              {order.orderStatus}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/${order._id}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Invoice
          </a>

          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white" /> WhatsApp
          </a>

          {isCancellable && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Visual Order Progress Tracker */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <h3 className="font-serif text-base font-bold text-stone-900 mb-2">Live Order Status</h3>
        <OrderTracker currentStatus={order.orderStatus} />
        {order.trackingNumber && (
          <p className="text-xs text-stone-600 pt-4 border-t border-stone-100">
            Courier Tracking Number: <span className="font-mono font-bold text-stone-900">{order.trackingNumber}</span>
          </p>
        )}
      </div>

      {/* Grid: Order Items & Delivery Address */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h3 className="font-serif text-base font-bold text-stone-900 pb-3 border-b border-stone-100">
            Purchased Garments ({order.items.length})
          </h3>
          <div className="space-y-4 divide-y divide-stone-100">
            {order.items.map((item) => (
              <div key={item._id} className="pt-4 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-16 h-20 object-cover rounded-lg bg-stone-100 shrink-0"
                  />
                  <div>
                    <h4 className="font-semibold text-stone-900 text-sm">{item.productName}</h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Size: <span className="font-medium text-stone-700">{item.size}</span> &bull; Color: <span className="font-medium text-stone-700">{item.color}</span>
                    </p>
                    <p className="text-stone-400 text-[11px] mt-0.5">SKU: {item.sku}</p>
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

        {/* Address and Payment Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3 text-xs">
            <h3 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
              Delivery Address
            </h3>
            <p className="font-bold text-stone-800">{order.shippingAddress.fullName}</p>
            <p className="text-stone-600">{order.shippingAddress.houseNo}, {order.shippingAddress.street}</p>
            <p className="text-stone-600">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
            <p className="text-stone-500 font-medium pt-1">Phone: {order.shippingAddress.phone}</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-3 text-xs">
            <h3 className="font-serif text-base font-bold text-stone-900 pb-2 border-b border-stone-100">
              Payment Information
            </h3>
            <div className="flex justify-between text-stone-600">
              <span>Payment Mode</span>
              <span className="font-semibold text-stone-900">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Payment Status</span>
              <span className="font-semibold text-stone-900">{order.paymentInfo.status}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Items Total</span>
              <span className="font-semibold text-stone-900">₹{order.pricing.itemsTotal}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Delivery Charge</span>
              <span className="font-semibold text-stone-900">
                {order.pricing.deliveryCharge === 0 ? 'FREE' : `₹${order.pricing.deliveryCharge}`}
              </span>
            </div>
            {order.pricing.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount ({order.pricing.couponCode || 'Coupon'})</span>
                <span>-₹{order.pricing.discountAmount}</span>
              </div>
            )}
            <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-sm text-stone-900">
              <span>Total Paid</span>
              <span className="text-[#832729]">₹{order.pricing.grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900">Cancel Order</h3>
            <p className="text-xs text-stone-600">
              Are you sure you want to cancel order {order.orderNumber}? The reserved garments will be returned to stock.
            </p>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Reason for cancellation</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Optional reason..."
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-xs font-semibold"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-red-700"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
