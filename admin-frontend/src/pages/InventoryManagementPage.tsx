import React, { useEffect, useState } from 'react';
import { Search, Download, AlertTriangle, CheckCircle2, XCircle, Edit2, Check } from 'lucide-react';
import api from '../services/api';
import { ProductVariant } from '../types';

export const InventoryManagementPage: React.FC = () => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [outOfStockFilter, setOutOfStockFilter] = useState(false);

  // Quick edit state
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Stock replenishment');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (keyword) params.set('keyword', keyword);
      if (lowStockFilter) params.set('lowStockOnly', 'true');
      if (outOfStockFilter) params.set('outOfStockOnly', 'true');

      const res = await api.get(`/variants/inventory?${params.toString()}`);
      if (res.data.success) {
        setVariants(res.data.variants);
      }
    } catch (err) {
      console.error('Error fetching inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [keyword, lowStockFilter, outOfStockFilter]);

  const handleSaveStock = async (variantId: string) => {
    try {
      const res = await api.put(`/variants/${variantId}/stock`, {
        newStock: newStockVal,
        reason: adjustReason
      });

      if (res.data.success) {
        setVariants((prev) =>
          prev.map((v) => (v._id === variantId ? { ...v, stockQuantity: newStockVal } : v))
        );
        setEditingVariantId(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update stock');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Variant-Level Inventory Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time stock levels per size, colour, and SKU across all garments.
          </p>
        </div>

        <a
          href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/export/inventory`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#832729]" /> Export Inventory (Excel)
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by SKU, size, or color..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto text-xs">
          <button
            onClick={() => {
              setLowStockFilter(!lowStockFilter);
              setOutOfStockFilter(false);
            }}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
              lowStockFilter
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Low Stock (&le; 5 pcs)
          </button>

          <button
            onClick={() => {
              setOutOfStockFilter(!outOfStockFilter);
              setLowStockFilter(false);
            }}
            className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
              outOfStockFilter
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Out of Stock (0 pcs)
          </button>
        </div>
      </div>

      {/* Inventory Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading variant inventory...</div>
        ) : variants.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No inventory records matching your query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Colour</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Available Stock</th>
                  <th className="py-3 px-4">Status Indicator</th>
                  <th className="py-3 px-4 text-right">Quick Stock Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variants.map((v) => {
                  const isEditing = editingVariantId === v._id;
                  const isOutOfStock = v.stockQuantity <= 0;
                  const isLowStock = v.stockQuantity > 0 && v.stockQuantity <= 5;

                  return (
                    <tr key={v._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {v.product?.name || 'Unknown Product'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: v.colorCode }}
                            className="w-3.5 h-3.5 rounded-full border border-slate-300"
                          />
                          <span className="font-semibold text-slate-700">{v.color}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                          {v.size}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {v.sku}
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={newStockVal}
                            onChange={(e) => setNewStockVal(Number(e.target.value))}
                            className="w-20 px-2 py-1 border border-[#832729] rounded text-xs font-bold"
                          />
                        ) : (
                          <span className="font-bold text-slate-900 text-sm">
                            {v.stockQuantity} pcs
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" /> Low Stock ({v.stockQuantity} left)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveStock(v._id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={() => setEditingVariantId(null)}
                              className="px-2.5 py-1 border rounded text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingVariantId(v._id);
                              setNewStockVal(v.stockQuantity);
                            }}
                            className="text-[#832729] hover:underline font-bold flex items-center justify-end gap-1 ml-auto"
                          >
                            <Edit2 className="w-3 h-3" /> Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
