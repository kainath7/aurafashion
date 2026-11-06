import React, { useEffect, useState } from 'react';
import { Search, Users, Mail, Phone, ShoppingBag, Eye, X } from 'lucide-react';
import api from '../services/api';

export const CustomerManagementPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  // Selected customer details modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/customers?keyword=${encodeURIComponent(keyword)}`);
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      console.error('Error fetching customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [keyword]);

  const handleViewCustomer = async (id: string) => {
    try {
      setLoadingDetails(true);
      const res = await api.get(`/admin/customers/${id}`);
      if (res.data.success) {
        setSelectedCustomer(res.data.customer);
      }
    } catch (err) {
      alert('Error fetching customer details');
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-slate-900">Customer Directory</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View registered shoppers, their historical order values, and delivery destinations.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, email, phone..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No customer accounts registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-xs">
                          {c.name.charAt(0)}
                        </div>
                        <span>{c.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <p>{c.email}</p>
                      <p className="text-[11px] text-slate-400">{c.phone || 'No phone provided'}</p>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                        {c.totalOrders} order(s)
                      </span>
                    </td>

                    <td className="py-3 px-4 font-serif font-bold text-slate-900 text-sm">
                      ₹{c.totalSpent}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewCustomer(c.id)}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold hover:bg-slate-800 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Order History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail & Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <p className="text-xs uppercase text-slate-400 font-bold">Customer Profile</p>
              <h2 className="font-serif text-2xl font-bold text-slate-900">{selectedCustomer.name}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {selectedCustomer.email} &bull; {selectedCustomer.phone}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
              <div>
                <p className="text-slate-400">Total Purchase Volume</p>
                <p className="font-serif text-xl font-bold text-[#832729]">₹{selectedCustomer.totalSpent}</p>
              </div>
              <div>
                <p className="text-slate-400">Total Placed Orders</p>
                <p className="font-serif text-xl font-bold text-slate-800">{selectedCustomer.totalOrders}</p>
              </div>
            </div>

            {/* Saved Addresses */}
            {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
              <div className="space-y-2 text-xs">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider">Saved Addresses</h3>
                <div className="space-y-2">
                  {selectedCustomer.addresses.map((addr: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg bg-white">
                      <p className="font-semibold text-slate-800">{addr.fullName} ({addr.phone})</p>
                      <p className="text-slate-600">{addr.houseNo}, {addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Orders */}
            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider">Order History</h3>
              {selectedCustomer.orders?.length === 0 ? (
                <p className="text-slate-400">No orders recorded.</p>
              ) : (
                <div className="space-y-2 divide-y divide-slate-100">
                  {selectedCustomer.orders?.map((ord: any) => (
                    <div key={ord._id} className="pt-2 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-800">{ord.orderNumber}</p>
                        <p className="text-slate-400 text-[11px]">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} &bull; {ord.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">₹{ord.pricing?.grandTotal}</span>
                        <span className="text-[10px] uppercase font-bold text-[#832729] bg-[#832729]/10 px-1.5 py-0.5 rounded">
                          {ord.orderStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
