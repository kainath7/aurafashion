import React, { useEffect, useState } from 'react';
import { Plus, Tag, Image as ImageIcon, Trash2, Edit, X } from 'lucide-react';
import api from '../services/api';
import { Banner, Coupon } from '../types';

export const PromotionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'banners' | 'coupons'>('banners');

  // Banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerLinkUrl, setBannerLinkUrl] = useState('/shop');
  const [bannerButtonText, setBannerButtonText] = useState('Shop Collection');
  const [bannerPosition, setBannerPosition] = useState<'HERO' | 'PROMO'>('HERO');
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDescription, setCouponDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderValue, setMinOrderValue] = useState(1499);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('500');
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const fetchBanners = async () => {
    try {
      setLoadingBanners(true);
      const res = await api.get('/banners/admin');
      if (res.data.success) {
        setBanners(res.data.banners);
      }
    } catch (err) {
      console.warn('Failed to fetch banners');
    } finally {
      setLoadingBanners(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await api.get('/coupons/admin');
      if (res.data.success) {
        setCoupons(res.data.coupons);
      }
    } catch (err) {
      console.warn('Failed to fetch coupons');
    } finally {
      setLoadingCoupons(false);
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchCoupons();
  }, []);

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerImageFile) return alert('Please select a banner image');

    try {
      const formData = new FormData();
      formData.append('title', bannerTitle);
      formData.append('subtitle', bannerSubtitle);
      formData.append('linkUrl', bannerLinkUrl);
      formData.append('buttonText', bannerButtonText);
      formData.append('position', bannerPosition);
      formData.append('image', bannerImageFile);

      await api.post('/banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsBannerModalOpen(false);
      setBannerTitle('');
      setBannerSubtitle('');
      setBannerImageFile(null);
      await fetchBanners();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save banner');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (confirm('Delete this banner?')) {
      await api.delete(`/banners/${id}`);
      await fetchBanners();
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/coupons', {
        code: couponCode,
        description: couponDescription,
        discountType,
        discountValue: Number(discountValue),
        minOrderValue: Number(minOrderValue),
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        expiryDate
      });

      setIsCouponModalOpen(false);
      setCouponCode('');
      setCouponDescription('');
      await fetchCoupons();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create coupon');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm('Delete this coupon?')) {
      await api.delete(`/coupons/${id}`);
      await fetchCoupons();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Promotions & Campaigns
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer customer discount promo codes and dynamic storefront banners.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'banners' ? (
            <button
              onClick={() => setIsBannerModalOpen(true)}
              className="px-4 py-2 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#6E1F21] flex items-center gap-1.5 shadow-md shadow-[#832729]/20"
            >
              <Plus className="w-4 h-4" /> Add Hero Banner
            </button>
          ) : (
            <button
              onClick={() => setIsCouponModalOpen(true)}
              className="px-4 py-2 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#6E1F21] flex items-center gap-1.5 shadow-md shadow-[#832729]/20"
            >
              <Plus className="w-4 h-4" /> Create Coupon Code
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('banners')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'banners'
              ? 'text-[#832729] border-b-2 border-[#832729]'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Homepage Banners ({banners.length})
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'coupons'
              ? 'text-[#832729] border-b-2 border-[#832729]'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <Tag className="w-4 h-4" /> Discount Coupons ({coupons.length})
        </button>
      </div>

      {/* Content based on tab */}
      {activeTab === 'banners' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((b) => (
            <div
              key={b._id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-3"
            >
              <div className="aspect-[16/9] bg-slate-100 relative">
                <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black/60 text-white">
                  {b.position}
                </span>
              </div>
              <div className="p-4 space-y-2 text-xs">
                <h3 className="font-bold text-slate-900 text-sm">{b.title}</h3>
                <p className="text-slate-500 line-clamp-2">{b.subtitle}</p>
                <div className="pt-2 flex justify-between items-center border-t text-[11px]">
                  <span className="font-mono text-slate-400">{b.linkUrl}</span>
                  <button
                    onClick={() => handleDeleteBanner(b._id)}
                    className="text-red-600 hover:underline font-bold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b">
              <tr>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Min Order Value</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4">Times Used</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((cp) => (
                <tr key={cp._id}>
                  <td className="py-3 px-4 font-mono font-bold text-[#832729] text-sm">
                    {cp.code}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {cp.discountType === 'PERCENTAGE'
                      ? `${cp.discountValue}% Off`
                      : `Flat ₹${cp.discountValue} Off`}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    ₹{cp.minOrderValue}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {new Date(cp.expiryDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {cp.usedCount}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteCoupon(cp._id)}
                      className="text-red-600 hover:underline font-bold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Banner Modal */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-serif text-lg font-bold text-slate-900">Add Homepage Banner</h3>
            <form onSubmit={handleCreateBanner} className="space-y-3">
              <div>
                <label className="font-bold block mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Subtitle</label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Link Destination</label>
                <input
                  type="text"
                  value={bannerLinkUrl}
                  onChange={(e) => setBannerLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Banner Image File *</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setBannerImageFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#832729] text-white rounded-lg font-bold uppercase"
                >
                  Upload Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-serif text-lg font-bold text-slate-900">Create Promo Coupon</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="font-bold block mb-1">Coupon Code (Uppercase) *</label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DIWALI20"
                  className="w-full px-3 py-2 border rounded-lg uppercase font-mono font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Type</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Min Order Value (₹)</label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#832729] text-white rounded-lg font-bold uppercase"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
