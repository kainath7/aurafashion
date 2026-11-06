import React, { useEffect, useState } from 'react';
import { Search, Download, MessageCircle, Eye, X, Check, Truck, Clock } from 'lucide-react';
import api from '../services/api';
import { Order } from '../types';

export const OrderManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');

  // Selected order details modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (keyword) params.set('keyword', keyword);

      const res = await api.get(`/orders/admin/all?${params.toString()}`);
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Error fetching admin orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, keyword]);

  const handleOpenDetails = (ord: Order) => {
    setSelectedOrder(ord);
    setNewStatus(ord.orderStatus);
    setStatusComment('');
    setTrackingNumber(ord.trackingNumber || '');
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      const res = await api.put(`/orders/admin/${selectedOrder._id}/status`, {
        status: newStatus,
        comment: statusComment,
        trackingNumber
      });

      if (res.data.success) {
        setSelectedOrder(res.data.order);
        setOrders((prev) => prev.map((o) => (o._id === selectedOrder._id ? res.data.order : o)));
        alert(`Order status updated to ${newStatus}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating order');
    } finally {
      setUpdating(false);
    }
  };

  const statusOptions = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'PACKED',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Order Fulfillment & Logistics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Process incoming orders, trigger live courier tracking updates, view customer shipping information.
          </p>
        </div>

        <a
          href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/orders`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#832729]" /> Export Full Order Log (Excel)
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order number, customer name, email, phone, city..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white w-full sm:w-auto"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No orders matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order Reference</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Delivery City</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Grand Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{ord.orderNumber}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{ord.customerInfo.name}</p>
                      <p className="text-[11px] text-slate-500">{ord.customerInfo.phone}</p>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {ord.shippingAddress.city}, {ord.shippingAddress.state}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        {ord.items.length} item(s)
                      </span>
                    </td>

                    <td className="py-3 px-4 font-serif font-bold text-slate-900 text-sm">
                      ₹{ord.pricing.grandTotal}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-[11px] text-slate-700 block">
                        {ord.paymentMethod}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase ${
                          ord.paymentInfo.status === 'COMPLETED'
                            ? 'text-emerald-700'
                            : ord.paymentInfo.status === 'FAILED'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {ord.paymentInfo.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ord.orderStatus === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.orderStatus === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ord.orderStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetails(ord)}
                          className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold hover:bg-slate-800 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative my-8">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-3">
              <div>
                <p className="text-xs uppercase text-slate-400 font-bold">Managing Order</p>
                <h2 className="font-serif text-2xl font-bold text-slate-900">
                  {selectedOrder.orderNumber}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Print Invoice */}
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/orders/${selectedOrder._id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> PDF Invoice
                </a>

                {/* WhatsApp Direct Link */}
                <a
                  href={`https://wa.me/91${selectedOrder.customerInfo.phone}?text=${encodeURIComponent(
                    `Hello ${selectedOrder.customerInfo.name}! This is Kainath from Aura Fashion regarding your order ${selectedOrder.orderNumber}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" /> WhatsApp Customer
                </a>
              </div>
            </div>

            {/* Status Transition Control */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-800">
                Update Order Lifecycle Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-white text-xs font-bold"
                  >
                    {statusOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Tracking Number / AWB</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Courier AWB code"
                    className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Fulfillment Note</label>
                  <input
                    type="text"
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="e.g. Dispatched via BlueDart"
                    className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="px-4 py-2 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#6E1F21]"
                >
                  {updating ? 'Broadcasting Update...' : 'Commit Status Change'}
                </button>
              </div>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider">Garments in Order</h3>
              <div className="space-y-2 divide-y divide-slate-100">
                {selectedOrder.items.map((item) => (
                  <div key={item._id} className="pt-2 first:pt-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={item.productImage} alt={item.productName} className="w-10 h-12 object-cover rounded" />
                      <div>
                        <p className="font-bold text-slate-800">{item.productName}</p>
                        <p className="text-slate-500 text-[11px]">
                          Size: {item.size} &bull; Color: {item.color} &bull; SKU: {item.sku} &bull; Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">₹{item.subtotal}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address & Customer Snapshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t">
              <div className="space-y-1">
                <p className="font-bold text-slate-800">Customer Details</p>
                <p className="text-slate-600">Name: {selectedOrder.customerInfo.name}</p>
                <p className="text-slate-600">Email: {selectedOrder.customerInfo.email}</p>
                <p className="text-slate-600">Phone: {selectedOrder.customerInfo.phone}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">Destination Address</p>
                  {selectedOrder.shippingAddress.latitude && selectedOrder.shippingAddress.longitude && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                      GPS Captured
                    </span>
                  )}
                </div>
                <p className="text-slate-600">
                  {selectedOrder.shippingAddress.houseNo}, {selectedOrder.shippingAddress.street}
                  {selectedOrder.shippingAddress.area ? `, ${selectedOrder.shippingAddress.area}` : ''}
                </p>
                {selectedOrder.shippingAddress.landmark && (
                  <p className="text-slate-500 text-[11px]">Landmark: {selectedOrder.shippingAddress.landmark}</p>
                )}
                <p className="text-slate-600">
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} -{' '}
                  <span className="font-mono font-semibold">{selectedOrder.shippingAddress.pincode}</span>
                </p>

                {selectedOrder.shippingAddress.latitude && selectedOrder.shippingAddress.longitude && (
                  <div className="pt-2">
                    <a
                      href={`https://www.google.com/maps?q=${selectedOrder.shippingAddress.latitude},${selectedOrder.shippingAddress.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[#832729] hover:underline flex items-center gap-1"
                    >
                      📍 Open Navigation Pin on Google Maps &rarr;
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
