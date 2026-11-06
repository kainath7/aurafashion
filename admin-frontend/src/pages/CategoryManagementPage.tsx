import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FolderTree, Image as ImageIcon, X } from 'lucide-react';
import api from '../services/api';
import { Category } from '../types';

export const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentCategory, setFormParentCategory] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories?includeInactive=true');
      if (res.data.success) {
        setCategories(res.data.tree || res.data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreateModal = (parentId = '') => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormParentCategory(parentId);
    setFormDisplayOrder(categories.length + 1);
    setFormIsActive(true);
    setFormImageFile(null);
    setFormImagePreview('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormParentCategory(cat.parentCategory?._id || cat.parentCategory || '');
    setFormDisplayOrder(cat.displayOrder || 0);
    setFormIsActive(cat.isActive);
    setFormImageFile(null);
    setFormImagePreview(cat.image?.url || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', formName);
      formData.append('description', formDescription);
      if (formParentCategory) formData.append('parentCategory', formParentCategory);
      formData.append('displayOrder', formDisplayOrder.toString());
      formData.append('isActive', String(formIsActive));
      if (formImageFile) formData.append('image', formImageFile);

      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/categories', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setIsModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      try {
        await api.delete(`/categories/${id}`);
        await fetchCategories();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error deleting category');
      }
    }
  };

  // Flat list of main categories for parent dropdown
  const rootCategories = categories.filter((c) => !c.parentCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Dynamic Category Hierarchy
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer primary apparel categories, subcategories, display sequencing and showcase photography.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="px-4 py-2.5 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#6E1F21] transition-all flex items-center gap-1.5 shadow-md shadow-[#832729]/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Root Category
        </button>
      </div>

      {/* Categories Tree */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No categories found. Create one to begin.</div>
        ) : (
          <div className="space-y-4">
            {categories.map((root) => (
              <div key={root._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                {/* Root Category Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={root.image?.url || 'https://via.placeholder.com/60'}
                      alt={root.name}
                      className="w-12 h-12 object-cover rounded-lg bg-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{root.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({root.slug})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            root.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {root.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {root.description || 'No description provided'} &bull; Display Order: {root.displayOrder}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenCreateModal(root._id)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Subcategory
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(root)}
                      className="p-1.5 text-slate-500 hover:text-[#832729]"
                      title="Edit Category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(root._id, root.name)}
                      className="p-1.5 text-slate-500 hover:text-red-600"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategories Child List */}
                {root.subcategories && root.subcategories.length > 0 && (
                  <div className="pl-6 pt-2 border-t border-slate-200/60 space-y-2">
                    {root.subcategories.map((sub) => (
                      <div
                        key={sub._id}
                        className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold">&bull;</span>
                          <span className="font-bold text-slate-800">{sub.name}</span>
                          <span className="text-slate-400 font-mono">({sub.slug})</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              sub.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {sub.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(sub)}
                            className="p-1 text-slate-400 hover:text-[#832729]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub._id, sub.name)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Kurtis & Tunics"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Parent Category (Leave empty for Root Category)
                </label>
                <select
                  value={formParentCategory}
                  onChange={(e) => setFormParentCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="">None (Top-Level Category)</option>
                  {rootCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short overview..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Display Sequencing Order</label>
                <input
                  type="number"
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Category Showcase Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFormImageFile(e.target.files[0]);
                      setFormImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="text-xs"
                />
                {formImagePreview && (
                  <img src={formImagePreview} alt="preview" className="mt-2 w-16 h-16 object-cover rounded-lg" />
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCat"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-[#832729]"
                />
                <label htmlFor="activeCat" className="font-semibold cursor-pointer">
                  Category is Active & Visible
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#832729] text-white font-bold uppercase rounded-lg hover:bg-[#6E1F21]"
                >
                  {submitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
