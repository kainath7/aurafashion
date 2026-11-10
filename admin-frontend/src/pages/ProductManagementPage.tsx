import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Camera,
  Image as ImageIcon,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Shirt,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import { Product, Category } from '../types';
import { getImageUrl, handleImageError } from '../utils/imageUrl';

export const ProductManagementPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formShortDescription, setFormShortDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formBrand, setFormBrand] = useState('Aura Fashion');
  const [formFabric, setFormFabric] = useState('');
  const [formBasePrice, setFormBasePrice] = useState<number>(1999);
  const [formDiscountPrice, setFormDiscountPrice] = useState<string>('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsNewArrival, setFormIsNewArrival] = useState(false);
  const [formIsTrending, setFormIsTrending] = useState(false);
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  // Variant generator state
  const [inputSizes, setInputSizes] = useState('S, M, L, XL');
  const [inputColors, setInputColors] = useState('Wine Red, Royal Navy, Jet Black');
  const [defaultVariantStock, setDefaultVariantStock] = useState(10);
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);

  // Files & previews
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/products?includeInactive=true&keyword=${encodeURIComponent(searchKeyword)}&category=${selectedCategoryFilter}&limit=100`
      );
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Error fetching products', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories?includeInactive=true');
      if (res.data.success) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.warn('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [searchKeyword, selectedCategoryFilter]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDescription('');
    setFormShortDescription('');
    setFormCategory(categories[0]?._id || '');
    setFormSubcategory('');
    setFormBrand('Aura Fashion');
    setFormFabric('Pure Georgette / Handloom Cotton');
    setFormBasePrice(2499);
    setFormDiscountPrice('');
    setFormIsFeatured(false);
    setFormIsNewArrival(true);
    setFormIsTrending(false);
    setFormIsBestSeller(false);
    setFormIsActive(true);
    setSelectedFiles([]);
    setFilePreviews([]);
    setExistingImages([]);
    setPrimaryImageIndex(0);
    setFormError('');

    // Generate initial variants
    buildVariantsFromInputs('S, M, L, XL', 'Wine Red, Royal Navy, Jet Black', 10);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormDescription(p.description);
    setFormShortDescription(p.shortDescription || '');
    setFormCategory(p.category?._id || (p.category as any) || '');
    setFormSubcategory(p.subcategory?._id || (p.subcategory as any) || '');
    setFormBrand(p.brand || 'Aura Fashion');
    setFormFabric(p.fabric || '');
    setFormBasePrice(p.basePrice);
    setFormDiscountPrice(p.discountPrice ? p.discountPrice.toString() : '');
    setFormIsFeatured(Boolean(p.isFeatured));
    setFormIsNewArrival(Boolean(p.isNewArrival));
    setFormIsTrending(Boolean(p.isTrending));
    setFormIsBestSeller(Boolean(p.isBestSeller));
    setFormIsActive(Boolean(p.isActive));
    setSelectedFiles([]);
    setFilePreviews([]);
    setExistingImages(p.images || []);
    const primIdx = p.images?.findIndex((i) => i.isPrimary);
    setPrimaryImageIndex(primIdx !== undefined && primIdx >= 0 ? primIdx : 0);
    setFormError('');

    // Load existing variants if available
    if (p.variants && p.variants.length > 0) {
      setGeneratedVariants(
        p.variants.map((v) => ({
          size: v.size,
          color: v.color,
          sku: v.sku,
          stockQuantity: v.stockQuantity,
          colorCode: v.colorCode || '#000000'
        }))
      );
    } else {
      buildVariantsFromInputs('S, M, L, XL', 'Wine Red', 10);
    }

    setIsModalOpen(true);
  };

  // Helper to cross product sizes & colors into matrix
  const buildVariantsFromInputs = (sizesStr: string, colorsStr: string, stock: number) => {
    const sizes = sizesStr.split(',').map((s) => s.trim()).filter(Boolean);
    const colors = colorsStr.split(',').map((c) => c.trim()).filter(Boolean);

    const matrix: any[] = [];
    sizes.forEach((s) => {
      colors.forEach((c) => {
        matrix.push({
          size: s,
          color: c,
          stockQuantity: stock,
          colorCode: '#000000',
          sku: ''
        });
      });
    });
    setGeneratedVariants(matrix);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      filesArr.forEach((file) => {
        if (!file.type.startsWith('image/')) {
          errors.push(`"${file.name}" is not a valid image format.`);
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          errors.push(`"${file.name}" exceeds 10MB limit.`);
          return;
        }
        validFiles.push(file);
      });

      if (errors.length > 0) {
        setFormError(errors.join(' '));
      }

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
        const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
        setFilePreviews((prev) => [...prev, ...newPreviews]);
      }
    }
  };

  const handleSetPrimaryExisting = (index: number) => {
    setExistingImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    );
    setPrimaryImageIndex(index);
  };

  const handleMoveExisting = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= existingImages.length) return;

    setExistingImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      // If removed was primary, default first to primary
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  const handleMoveNew = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedFiles.length) return;

    setSelectedFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });

    setFilePreviews((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveNewFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', formName);
      formData.append('description', formDescription);
      formData.append('shortDescription', formShortDescription);
      formData.append('category', formCategory);
      if (formSubcategory) formData.append('subcategory', formSubcategory);
      formData.append('brand', formBrand);
      formData.append('fabric', formFabric);
      formData.append('basePrice', formBasePrice.toString());
      if (formDiscountPrice) formData.append('discountPrice', formDiscountPrice);
      formData.append('isFeatured', String(formIsFeatured));
      formData.append('isNewArrival', String(formIsNewArrival));
      formData.append('isTrending', String(formIsTrending));
      formData.append('isBestSeller', String(formIsBestSeller));
      formData.append('isActive', String(formIsActive));
      formData.append('primaryImageIndex', String(primaryImageIndex));

      // Append variants payload
      formData.append('variants', JSON.stringify(generatedVariants));

      // Append files
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });

      if (editingProduct) {
        formData.append('existingImages', JSON.stringify(existingImages));
        await api.put(`/products/${editingProduct._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Error saving product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete "${name}"? Associated stock variants will be removed.`)) {
      try {
        await api.delete(`/products/${id}`);
        await fetchProducts();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error deleting product');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">Garment Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage clothing products, multiple photography angles, and size/color variant stock.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#6E1F21] transition-all flex items-center gap-1.5 shadow-md shadow-[#832729]/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Garment
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, brand, fabric, tags..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#832729]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading catalog...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Shirt className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No products found</p>
            <p className="text-xs text-slate-400">Add a product or adjust your search filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Garment</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Base Price</th>
                  <th className="py-3 px-4">Sale Price</th>
                  <th className="py-3 px-4">Variants</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const primaryImg = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url;
                  const totalStock = p.variants?.reduce((sum, v) => sum + v.stockQuantity, 0) || 0;

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getImageUrl(primaryImg)}
                            alt={p.name}
                            onError={handleImageError}
                            className="w-10 h-12 object-cover rounded bg-slate-100"
                          />
                          <div>
                            <p className="font-bold text-slate-800 line-clamp-1">{p.name}</p>
                            <p className="text-[11px] text-slate-400">{p.brand} &bull; {p.fabric || 'Fabric'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {p.category?.name || 'Unassigned'}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        ₹{p.basePrice}
                      </td>

                      <td className="py-3 px-4">
                        {p.discountPrice ? (
                          <span className="font-bold text-[#832729]">₹{p.discountPrice}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          {p.variants?.length || 0} vars ({totalStock} pcs)
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-[#832729] hover:bg-slate-100 rounded"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p._id, p.name)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-serif text-xl font-bold text-slate-900">
              {editingProduct ? 'Edit Garment & Variants' : 'Add New Garment to Catalog'}
            </h2>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b">
                  1. Essential Garment Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Garment Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Celestial Embroidered Georgette Anarkali"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Brand / Collection</label>
                    <input
                      type="text"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      placeholder="e.g. Aura Fashion Exclusive"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Primary Category *</label>
                    <select
                      required
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Fabric & Material</label>
                    <input
                      type="text"
                      value={formFabric}
                      onChange={(e) => setFormFabric(e.target.value)}
                      placeholder="e.g. 100% European Flax Linen"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Base Price (INR) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formBasePrice}
                      onChange={(e) => setFormBasePrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Discount Sale Price (Optional)</label>
                    <input
                      type="number"
                      min={0}
                      value={formDiscountPrice}
                      onChange={(e) => setFormDiscountPrice(e.target.value)}
                      placeholder="Leave blank if no discount"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe tailoring, styling nuances, fit..."
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Multiple Photography Angles */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-1 border-b">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    2. Product Photography (Multiple Images & Camera)
                  </h3>
                  <span className="text-slate-400">At least 1 required</span>
                </div>

                {/* Upload Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-700">
                    <ImageIcon className="w-4 h-4 text-[#832729]" />
                    <span>Upload Images from Device</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* Device Camera Capture */}
                  <label className="cursor-pointer px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-700">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Take Photo with Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Thumbnails Gallery preview with Reordering & Primary Selection */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] text-slate-500">
                    Click <strong>⭐</strong> or <strong>Make Primary</strong> to set the showcase thumbnail. Use arrows to reorder.
                  </p>

                  <div className="flex flex-wrap gap-4 pt-1">
                    {/* Existing images */}
                    {existingImages.map((img, i) => {
                      const isPrimary = Boolean(img.isPrimary || (i === 0 && !existingImages.some((x) => x.isPrimary)));
                      return (
                        <div
                          key={`existing-${i}`}
                          className={`relative w-28 rounded-xl overflow-hidden border-2 bg-slate-50 shadow-xs flex flex-col ${
                            isPrimary ? 'border-[#832729] ring-2 ring-[#832729]/20' : 'border-slate-200'
                          }`}
                        >
                          <div className="relative h-28 w-full bg-slate-100">
                            <img
                              src={getImageUrl(img.url)}
                              alt={`Angle ${i + 1}`}
                              onError={handleImageError}
                              className="w-full h-full object-cover"
                            />
                            {/* Primary Badge */}
                            {isPrimary ? (
                              <span className="absolute top-1 left-1 bg-[#832729] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" /> Primary
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryExisting(i)}
                                className="absolute top-1 left-1 bg-black/60 hover:bg-[#832729] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs transition"
                              >
                                Set Primary
                              </button>
                            )}

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(i)}
                              title="Delete from gallery"
                              className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-xs transition cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Reordering controls */}
                          <div className="p-1 bg-white border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => handleMoveExisting(i, -1)}
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
                            </button>
                            <span className="text-slate-400 font-mono text-[9px]">#{i + 1}</span>
                            <button
                              type="button"
                              disabled={i === existingImages.length - 1}
                              onClick={() => handleMoveExisting(i, 1)}
                              className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Newly selected images */}
                    {filePreviews.map((url, i) => (
                      <div
                        key={`new-${i}`}
                        className="relative w-28 rounded-xl overflow-hidden border-2 border-emerald-500 bg-slate-50 shadow-xs flex flex-col"
                      >
                        <div className="relative h-28 w-full bg-slate-100">
                          <img
                            src={url}
                            alt={`New preview ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            New Upload
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveNewFile(i)}
                            title="Remove file"
                            className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-xs transition cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Reordering controls for new uploads */}
                        <div className="p-1 bg-white border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => handleMoveNew(i, -1)}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                            title="Move Left"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
                          </button>
                          <span className="text-emerald-600 font-mono text-[9px]">+{i + 1}</span>
                          <button
                            type="button"
                            disabled={i === filePreviews.length - 1}
                            onClick={() => handleMoveNew(i, 1)}
                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                            title="Move Right"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Variant Matrix Generator */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-1 border-b">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    3. Clothing Variant Matrix & Stock per Size/Color
                  </h3>
                  <button
                    type="button"
                    onClick={() => buildVariantsFromInputs(inputSizes, inputColors, defaultVariantStock)}
                    className="text-[#832729] font-bold underline"
                  >
                    Re-generate Matrix
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Sizes (comma-separated)</label>
                    <input
                      type="text"
                      value={inputSizes}
                      onChange={(e) => setInputSizes(e.target.value)}
                      placeholder="S, M, L, XL"
                      className="w-full px-2.5 py-1.5 border rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Colors (comma-separated)</label>
                    <input
                      type="text"
                      value={inputColors}
                      onChange={(e) => setInputColors(e.target.value)}
                      placeholder="Wine Red, Navy Blue"
                      className="w-full px-2.5 py-1.5 border rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Initial Stock per Variant</label>
                    <input
                      type="number"
                      value={defaultVariantStock}
                      onChange={(e) => setDefaultVariantStock(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border rounded bg-white"
                    />
                  </div>
                </div>

                {/* Variants editable table */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-500 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">Size</th>
                        <th className="p-2">Color</th>
                        <th className="p-2">SKU (Auto or Custom)</th>
                        <th className="p-2">Stock Quantity</th>
                        <th className="p-2">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {generatedVariants.map((v, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold">{v.size}</td>
                          <td className="p-2 font-medium">{v.color}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => {
                                const copy = [...generatedVariants];
                                copy[idx].sku = e.target.value;
                                setGeneratedVariants(copy);
                              }}
                              placeholder="Auto-generated if empty"
                              className="px-2 py-1 border rounded w-36 text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              value={v.stockQuantity}
                              onChange={(e) => {
                                const copy = [...generatedVariants];
                                copy[idx].stockQuantity = Number(e.target.value);
                                setGeneratedVariants(copy);
                              }}
                              className="px-2 py-1 border rounded w-20 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setGeneratedVariants((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Flags */}
              <div className="pt-2 border-t flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded text-[#832729]"
                  />
                  Featured Section
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={formIsNewArrival}
                    onChange={(e) => setFormIsNewArrival(e.target.checked)}
                    className="rounded text-[#832729]"
                  />
                  New Arrival
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={formIsTrending}
                    onChange={(e) => setFormIsTrending(e.target.checked)}
                    className="rounded text-[#832729]"
                  />
                  Trending Style
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-[#832729]"
                  />
                  Active in Storefront
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#832729] text-white rounded-lg font-bold uppercase tracking-wider hover:bg-[#6E1F21]"
                >
                  {submitting ? 'Saving Garment...' : 'Save Product & Variants'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
