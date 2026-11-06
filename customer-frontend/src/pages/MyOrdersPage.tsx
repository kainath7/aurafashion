import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Clock, Eye } from 'lucide-react';
import api from '../services/api';
import { Order } from '../types';

export const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders/my-orders');
        if (res.data.success) {
          setOrders(res.data.orders);
        }
      } catch (err) {
        console.error('Error fetching customer orders', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="max-w-5xl mx-auto py-20 text-center text-xs">Loading orders...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-2">My Orders</h1>
      <p className="text-xs text-stone-500 mb-8">Track progress, view invoices, or re-order garments.</p>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-stone-800 mb-1">No orders yet</h3>
          <p className="text-xs text-stone-500 mb-6">You haven't placed any orders with Aura Fashion yet.</p>
          <Link
            to="/shop"
            className="px-6 py-2.5 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div
              key={ord._id}
              className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-base font-bold text-stone-900">{ord.orderNumber}</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#832729]/10 text-[#832729]">
                    {ord.orderStatus}
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Placed on {new Date(ord.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} &bull; {ord.items.length} item(s)
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {ord.items.slice(0, 3).map((item, idx) => (
                    <img
                      key={idx}
                      src={item.productImage}
                      alt={item.productName}
                      className="w-10 h-12 object-cover rounded bg-stone-100"
                    />
                  ))}
                  {ord.items.length > 3 && (
                    <span className="text-xs text-stone-400 font-semibold">+{ord.items.length - 3} more</span>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
                <div className="sm:text-right">
                  <p className="text-xs text-stone-400">Total Amount</p>
                  <p className="font-serif text-lg font-bold text-[#832729]">₹{ord.pricing.grandTotal}</p>
                </div>

                <Link
                  to={`/order/${ord._id}`}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-bold uppercase tracking-wider text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Details & Track
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
