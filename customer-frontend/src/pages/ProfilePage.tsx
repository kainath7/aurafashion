import React, { useState } from 'react';
import { User, MapPin, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Address } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, addAddress, deleteAddress } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState('');

  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState<Omit<Address, '_id'>>({
    fullName: user?.name || '',
    phone: user?.phone || '',
    houseNo: '',
    street: '',
    landmark: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '',
    isDefault: false
  });

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(name, phone);
      setProfileMsg('Profile updated successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('Failed to update profile.');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAddress(newAddr);
      setShowAddAddr(false);
      setNewAddr({
        fullName: user?.name || '',
        phone: user?.phone || '',
        houseNo: '',
        street: '',
        landmark: '',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '',
        isDefault: false
      });
    } catch (err: any) {
      alert(err.message || 'Failed to add address');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      <h1 className="font-serif text-3xl font-bold text-stone-900">Customer Profile</h1>

      {/* Account Info Form */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <h2 className="font-serif text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[#832729]" /> Personal Details
        </h2>

        {profileMsg && (
          <p className="p-3 mb-4 bg-emerald-50 text-emerald-700 text-xs rounded-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {profileMsg}
          </p>
        )}

        <form onSubmit={handleProfileSave} className="space-y-4 text-xs max-w-lg">
          <div>
            <label className="font-bold text-stone-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">Email Address (Read-only)</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 border border-stone-200 bg-stone-50 rounded-lg text-xs text-stone-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#6E1F21]"
          >
            Save Changes
          </button>
        </form>
      </div>

      {/* Addresses */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h2 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#832729]" /> Saved Delivery Addresses
          </h2>
          {!showAddAddr && (
            <button
              onClick={() => setShowAddAddr(true)}
              className="text-xs font-bold text-[#832729] hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Address
            </button>
          )}
        </div>

        {/* List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {user?.addresses?.map((addr) => (
            <div key={addr._id} className="p-4 rounded-xl border border-stone-200 text-xs space-y-1 relative">
              <div className="flex justify-between">
                <span className="font-bold text-stone-900">{addr.fullName}</span>
                <button
                  onClick={() => addr._id && deleteAddress(addr._id)}
                  className="text-stone-400 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-stone-600">{addr.houseNo}, {addr.street}</p>
              <p className="text-stone-600">{addr.city}, {addr.state} - {addr.pincode}</p>
              <p className="text-stone-500 font-medium">Phone: {addr.phone}</p>
            </div>
          ))}
        </div>

        {showAddAddr && (
          <form onSubmit={handleAddAddress} className="space-y-3 text-xs pt-4 border-t border-stone-200">
            <h3 className="font-bold text-stone-800">Add New Delivery Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full Name *"
                required
                value={newAddr.fullName}
                onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Phone *"
                required
                value={newAddr.phone}
                onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="House / Flat No *"
                required
                value={newAddr.houseNo}
                onChange={(e) => setNewAddr({ ...newAddr, houseNo: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Street / Locality *"
                required
                value={newAddr.street}
                onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="City *"
                required
                value={newAddr.city}
                onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="State *"
                required
                value={newAddr.state}
                onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="PIN Code *"
                required
                value={newAddr.pincode}
                onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#832729] text-white rounded-lg text-xs font-bold uppercase"
              >
                Save Address
              </button>
              <button
                type="button"
                onClick={() => setShowAddAddr(false)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
