import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Users,
  Shirt,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Download
} from 'lucide-react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { DashboardStats } from '../types';

export const DashboardOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlySales, setMonthlySales] = useState<{ label: string; sales: number; orders: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/reports/dashboard-stats');
      if (res.data.success) {
        setStats(res.data.stats);
        setMonthlySales(res.data.monthlySales || []);
        setRecentOrders(res.data.recentOrders || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading live database metrics...</div>;
  }

  // Find maximum monthly sales for chart scaling
  const maxSales = monthlySales.reduce((max, curr) => Math.max(max, curr.sales), 10000);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Aura Fashion Executive Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time business performance derived directly from database records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/orders`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#832729]" /> Export Orders (Excel)
          </a>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Revenue"
          value={`₹${stats?.totalRevenue.toLocaleString('en-IN') || 0}`}
          icon={DollarSign}
          color="text-emerald-600"
          subtext="Net confirmed sales"
        />
        <StatCard
          label="Total Orders"
          value={stats?.totalOrders || 0}
          icon={ShoppingBag}
          color="text-[#832729]"
          subtext={`${stats?.completedOrders || 0} delivered successfully`}
        />
        <StatCard
          label="Pending Dispatch"
          value={stats?.pendingOrders || 0}
          icon={Clock}
          color="text-amber-600"
          subtext="Requires packing / fulfillment"
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats?.lowStockCount || 0}
          icon={AlertTriangle}
          color="text-red-600"
          subtext={`${stats?.outOfStockCount || 0} variants out of stock`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Active Garment Styles"
          value={stats?.totalProducts || 0}
          icon={Shirt}
          color="text-indigo-600"
        />
        <StatCard
          label="Registered Customers"
          value={stats?.totalCustomers || 0}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          label="Delivered Orders"
          value={stats?.completedOrders || 0}
          icon={CheckCircle2}
          color="text-emerald-600"
        />
        <StatCard
          label="Growth Index"
          value="100% Dynamic"
          icon={TrendingUp}
          color="text-[#D4AF37]"
          subtext="MongoDB Atlas backend"
        />
      </div>

      {/* Monthly Sales Chart & Recent Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-serif text-base font-bold text-slate-900">
                Monthly Revenue Performance
              </h3>
              <p className="text-xs text-slate-400">Total volume in INR per month</p>
            </div>
            <span className="text-xs font-bold text-[#832729] bg-[#832729]/10 px-2.5 py-1 rounded">
              Verified Transactions
            </span>
          </div>

          {/* Visual SVG / HTML Bar Chart */}
          {monthlySales.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No previous monthly order history recorded yet.
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="h-56 flex items-end gap-6 justify-between px-4 pb-2 border-b border-slate-200">
                {monthlySales.map((item, idx) => {
                  const heightPercent = Math.max(12, Math.round((item.sales / maxSales) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded pointer-events-none whitespace-nowrap shadow-md">
                        ₹{item.sales} ({item.orders} orders)
                      </div>

                      <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg h-full flex items-end overflow-hidden">
                        <div
                          className="w-full bg-[#832729] rounded-t-lg transition-all duration-700 group-hover:bg-[#6E1F21]"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Orders List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-serif text-base font-bold text-slate-900">Recent Orders</h3>
            <Link
              to="/orders"
              className="text-xs font-bold text-[#832729] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No orders placed yet.</p>
            ) : (
              recentOrders.map((ord) => (
                <div key={ord._id} className="pt-3 first:pt-0 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{ord.orderNumber}</span>
                    <span className="font-bold text-[#832729]">₹{ord.pricing?.grandTotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>{ord.customerInfo?.name}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {ord.orderStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
