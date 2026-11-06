import React, { useEffect, useState } from 'react';
import { Download, BarChart3, FileSpreadsheet, Package, ShoppingBag } from 'lucide-react';
import api from '../services/api';
import { DashboardStats } from '../types';

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/reports/dashboard-stats');
        if (res.data.success) {
          setStats(res.data.stats);
          setMonthlySales(res.data.monthlySales || []);
        }
      } catch (err) {
        console.error('Error fetching reports data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const exportOrdersUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/orders`;
  const exportInventoryUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/inventory`;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-slate-900">
          Executive Reports & Data Exports
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate structured operational records and download audit spreadsheets.
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900">
                Customer Orders Ledger
              </h2>
              <p className="text-xs text-slate-400">Complete sales transactions, addresses & payment status</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Export every order record in Microsoft Excel (.xlsx) format for financial auditing, tax reconciliation, and dispatch reviews.
          </p>
          <a
            href={exportOrdersUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Orders (Excel)
          </a>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-900">
                Variant Inventory Log
              </h2>
              <p className="text-xs text-slate-400">Stock per SKU, color, and size breakdown</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Export all garment SKUs, size/color variant combinations, current warehouse stock levels, and alert statuses to Excel.
          </p>
          <a
            href={exportInventoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-[#832729] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#6E1F21] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Inventory (Excel)
          </a>
        </div>
      </div>

      {/* Historical Sales Monthly Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="font-serif text-base font-bold text-slate-900 pb-2 border-b">
          Monthly Order & Revenue Summary
        </h2>

        {monthlySales.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No sales history yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Total Orders</th>
                <th className="py-2.5 px-4 text-right">Revenue (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlySales.map((item, i) => (
                <tr key={i}>
                  <td className="py-3 px-4 font-bold text-slate-800">{item.label}</td>
                  <td className="py-3 px-4 font-semibold text-slate-600">{item.orders} order(s)</td>
                  <td className="py-3 px-4 font-serif font-bold text-[#832729] text-right">
                    ₹{item.sales.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
