import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  MapPin,
  Plus,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Loader2,
  Edit2,
  Layers,
  Map as MapIcon
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import api from '../services/api';
import { Address } from '../types';
import { DeliveryLocationMap } from '../components/checkout/DeliveryLocationMap';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, subtotal, coupon, clearCart } = useCart();
  const { user, isAuthenticated, login, register, addAddress } = useAuth();
  const { settings } = useStoreSettings();

  // Auth form states for guest checkout prompt
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Address form states
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<Omit<Address, '_id'>>({
    fullName: '',
    phone: '',
    houseNo: '',
    street: '',
    area: '',
    landmark: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '',
    isDefault: true,
    latitude: null,
    longitude: null,
    formattedAddress: '',
    addressSource: 'MANUAL'
  });

  // GPS & Map Integration States
  const [isLocating, setIsLocating] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsSuccess, setGpsSuccess] = useState('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Debounce ref for map dragging
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Delivery calculation
  const freeDeliveryThreshold = settings.freeDeliveryThreshold || 1499;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryCharge = isFreeDelivery ? 0 : settings.deliveryCharge;
  const discountAmount = coupon?.discountAmount || 0;
  const grandTotal = Math.max(0, subtotal + deliveryCharge - discountAmount);

  // Prefill address form with user details when logged in
  useEffect(() => {
    if (user) {
      setAddressForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        phone: prev.phone || user.phone || ''
      }));
      if (user.addresses && user.addresses.length > 0) {
        setShowNewAddressForm(false);
      } else {
        setShowNewAddressForm(true);
      }
    }
  }, [user]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
    };
  }, []);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900 mb-2">No items to checkout</h2>
        <Link to="/shop" className="text-xs font-bold uppercase text-[#832729] hover:underline">
          Return to Collections
        </Link>
      </div>
    );
  }

  // Handle Guest Authentication right on checkout
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        await login(authEmail, authPassword);
      } else {
        await register(authName, authEmail, authPassword, authPhone);
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  /**
   * Reverse Geocode coordinates to address fields using Aura Fashion backend endpoint
   */
  const performReverseGeocode = async (
    lat: number,
    lng: number,
    source: 'GPS' | 'MAP_PICKER' = 'GPS'
  ) => {
    try {
      setReverseGeocoding(true);
      const res = await api.get('/geocode/reverse', {
        params: { lat, lng }
      });

      if (res.data.success && res.data.data) {
        const d = res.data.data;
        setAddressForm((prev) => ({
          ...prev,
          houseNo: d.houseNo || prev.houseNo,
          street: d.street || prev.street,
          area: d.area || prev.area,
          city: d.city || prev.city || 'Bengaluru',
          state: d.state || prev.state || 'Karnataka',
          pincode: d.pincode || prev.pincode,
          landmark: d.landmark || prev.landmark,
          latitude: lat,
          longitude: lng,
          formattedAddress: d.formattedAddress || `${d.street}, ${d.city}`,
          addressSource: source
        }));

        setGpsSuccess(
          source === 'GPS'
            ? '📍 GPS coordinates locked! Address fields populated automatically. You can edit any detail below.'
            : '📍 Pin location updated! Address fields adjusted to the new marker location.'
        );
        setTimeout(() => setGpsSuccess(''), 5000);
      }
    } catch (err: any) {
      console.warn('Reverse geocode warning:', err);
      // Still store coordinates even if geocoding text failed so coordinates aren't lost
      setAddressForm((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        addressSource: source
      }));
      setGpsError(
        'Coordinates detected, but automatic address lookup took too long. Please verify or fill in street and city details manually.'
      );
    } finally {
      setReverseGeocoding(false);
    }
  };

  /**
   * Request browser geolocation permission and acquire accurate coordinates
   */
  const handleUseCurrentLocation = () => {
    setGpsError('');
    setGpsSuccess('');

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser. Please enter your address manually.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setGpsAccuracy(accuracy || null);
        setShowMap(true);
        await performReverseGeocode(latitude, longitude, 'GPS');
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Failed to detect location. Please enter your address manually.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg =
              'Location permission was denied. Please allow location access in your browser settings or fill in your delivery address manually below.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg =
              'GPS location is currently unavailable. Please verify your device location settings or enter address manually.';
            break;
          case error.TIMEOUT:
            msg = 'GPS location detection timed out. Please retry or enter address manually.';
            break;
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  /**
   * Handle map marker drag or map click with debounce
   */
  const handleMapLocationChange = (newLat: number, newLng: number) => {
    setCurrentCoords({ lat: newLat, lng: newLng });

    if (geocodeDebounceRef.current) {
      clearTimeout(geocodeDebounceRef.current);
    }

    geocodeDebounceRef.current = setTimeout(() => {
      performReverseGeocode(newLat, newLng, 'MAP_PICKER');
    }, 400);
  };

  // Handle Placing Order
  const handlePlaceOrder = async () => {
    setOrderError('');
    setOrderProcessing(true);

    try {
      // Determine shipping address
      let shippingAddress: Address;
      if (user?.addresses && user.addresses.length > 0 && !showNewAddressForm) {
        shippingAddress = user.addresses[selectedAddressIndex];
      } else {
        if (
          !addressForm.fullName ||
          !addressForm.phone ||
          !addressForm.houseNo ||
          !addressForm.street ||
          !addressForm.city ||
          !addressForm.pincode
        ) {
          throw new Error('Please fill all required delivery address fields (Name, Phone, House/Flat, Street, City, and PIN code).');
        }

        if (addressForm.pincode.trim().length < 5) {
          throw new Error('Please enter a valid PIN code.');
        }

        if (addressForm.phone.replace(/\D/g, '').length < 10) {
          throw new Error('Please enter a valid 10-digit mobile number.');
        }

        // Save new address to user profile
        const updated = await addAddress(addressForm);
        shippingAddress = updated[updated.length - 1];
      }

      // Prepare order items
      const itemsPayload = cartItems.map((item) => ({
        variantId: item.variant._id,
        quantity: item.quantity
      }));

      // Create order on backend
      const res = await api.post('/orders', {
        items: itemsPayload,
        shippingAddress,
        paymentMethod,
        couponCode: coupon?.code || null
      });

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to place order');
      }

      const order = res.data.order;

      // Handle Cash on Delivery
      if (paymentMethod === 'COD') {
        clearCart();
        navigate(`/order-success/${order._id}`);
        return;
      }

      // Handle Razorpay Payment
      if (paymentMethod === 'RAZORPAY') {
        const razorpayKey = res.data.razorpayKey;
        const razorpayOrder = res.data.razorpayOrder;

        if (!window.Razorpay) {
          alert('Razorpay gateway is initializing in test mode.');
          navigate(`/order-success/${order._id}`);
          return;
        }

        const options = {
          key: razorpayKey,
          amount: Math.round(grandTotal * 100),
          currency: 'INR',
          name: settings.shopName || 'Aura Fashion',
          description: `Order ${order.orderNumber}`,
          image: settings.logoUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&q=80',
          order_id: razorpayOrder?.id,
          prefill: {
            name: order.customerInfo.name,
            email: order.customerInfo.email,
            contact: order.customerInfo.phone
          },
          theme: {
            color: '#832729'
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await api.post(`/orders/${order._id}/verify-payment`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyRes.data.success) {
                clearCart();
                navigate(`/order-success/${order._id}`);
              } else {
                setOrderError('Payment verification failed.');
              }
            } catch (err: any) {
              setOrderError(err.message || 'Payment verification failed.');
            }
          },
          modal: {
            ondismiss: function () {
              setOrderProcessing(false);
              setOrderError('Payment process was interrupted. You can retry anytime.');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setOrderError(err.response?.data?.message || err.message || 'Error creating order.');
      setOrderProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-8">Secure Checkout</h1>

      {/* Guest Authentication Interceptor Requirement */}
      {!isAuthenticated ? (
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#832729]/10 text-[#832729] rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              {authMode === 'login' ? 'Welcome Back to Aura Fashion' : 'Create Your Customer Account'}
            </h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Please sign in to confirm delivery addresses, track orders in real-time, and securely complete checkout. Your bag items are saved!
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {authMode === 'register' && (
              <div>
                <label className="font-bold text-stone-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. Kainath Begum"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
                />
              </div>
            )}

            <div>
              <label className="font-bold text-stone-700 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="font-bold text-stone-700 block mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
                />
              </div>
            )}

            <div>
              <label className="font-bold text-stone-700 block mb-1">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-[#832729] text-white font-bold uppercase tracking-widest rounded-lg hover:bg-[#6E1F21] transition-all shadow-lg"
            >
              {authLoading ? 'Verifying...' : authMode === 'login' ? 'Sign In & Continue' : 'Register & Continue'}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-stone-100">
            {authMode === 'login' ? (
              <p className="text-xs text-stone-500">
                New to Aura Fashion?{' '}
                <button
                  onClick={() => setAuthMode('register')}
                  className="text-[#832729] font-bold hover:underline"
                >
                  Create an Account
                </button>
              </p>
            ) : (
              <p className="text-xs text-stone-500">
                Already have an account?{' '}
                <button
                  onClick={() => setAuthMode('login')}
                  className="text-[#832729] font-bold hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Authenticated Checkout Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left 2 Columns: Address & Payment Selection */}
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Address Card Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#832729]" /> Delivery address
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Select a saved address, detect your doorstep via GPS, or enter details manually.
                  </p>
                </div>

                {user?.addresses && user.addresses.length > 0 && !showNewAddressForm && (
                  <button
                    onClick={() => setShowNewAddressForm(true)}
                    className="text-xs font-bold text-[#832729] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Address
                  </button>
                )}
              </div>

              {/* Saved Addresses List (If Available) */}
              {user?.addresses && user.addresses.length > 0 && !showNewAddressForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.addresses.map((addr, idx) => (
                      <div
                        key={addr._id || idx}
                        onClick={() => setSelectedAddressIndex(idx)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedAddressIndex === idx
                            ? 'border-[#832729] bg-[#832729]/5 shadow-xs'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-stone-900">{addr.fullName}</span>
                          {selectedAddressIndex === idx && (
                            <CheckCircle2 className="w-4 h-4 text-[#832729]" />
                          )}
                        </div>
                        <p className="text-xs text-stone-600 mt-1">
                          {addr.houseNo}, {addr.street}
                          {addr.area ? `, ${addr.area}` : ''}
                        </p>
                        {addr.landmark && (
                          <p className="text-[11px] text-stone-400">Landmark: {addr.landmark}</p>
                        )}
                        <p className="text-xs text-stone-600">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-xs text-stone-500 mt-2 font-medium">Phone: {addr.phone}</p>
                        {addr.latitude && addr.longitude && (
                          <span className="inline-block mt-2 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                            📍 GPS Pin Saved
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(true)}
                    className="text-xs font-bold text-[#832729] hover:underline flex items-center gap-1.5 pt-1"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Use Current Location or Enter a Different Address
                  </button>
                </div>
              ) : (
                /* Interactive Address Setup: GPS + Manual Entry (matching reference mockup) */
                <div className="space-y-6">
                  {/* Option 1: Use My Current Location (GPS) */}
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Navigation className="w-3 h-3 fill-emerald-600" />
                      </div>
                      <h3 className="font-serif text-sm font-bold text-stone-900">
                        Use my current location
                      </h3>
                    </div>

                    <p className="text-xs text-stone-500">
                      Detect the customer's GPS coordinates and fetch a readable address automatically.
                    </p>

                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating || reverseGeocoding}
                      className="w-full py-3 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLocating || reverseGeocoding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{isLocating ? 'Detecting GPS Location...' : 'Fetching Address Details...'}</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4 fill-white" />
                          <span>Use current location</span>
                        </>
                      )}
                    </button>

                    {/* Geolocation feedback alerts */}
                    {gpsError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">{gpsError}</p>
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            You can easily enter your delivery details in the manual fields below.
                          </p>
                        </div>
                      </div>
                    )}

                    {gpsSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{gpsSuccess}</span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Map Component (Displayed when coordinates exist or toggled) */}
                  {(currentCoords || showMap) && (
                    <div className="pt-2">
                      <DeliveryLocationMap
                        latitude={currentCoords?.lat || 12.9716}
                        longitude={currentCoords?.lng || 77.5946}
                        accuracy={gpsAccuracy}
                        addressPreview={addressForm.formattedAddress || `${addressForm.street}, ${addressForm.city}`}
                        onLocationChange={handleMapLocationChange}
                        onRecenter={handleUseCurrentLocation}
                        isDetecting={isLocating || reverseGeocoding}
                      />
                    </div>
                  )}

                  {/* Section 2: Manual Address Entry */}
                  <div className="pt-4 border-t border-stone-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-sm font-bold text-stone-900">
                          Or enter address manually
                        </h3>
                        <p className="text-[11px] text-stone-400">
                          Example fields for the checkout form (fully editable at all times)
                        </p>
                      </div>

                      {addressForm.latitude && addressForm.longitude && (
                        <button
                          type="button"
                          onClick={() => setShowMap(!showMap)}
                          className="text-[11px] text-[#832729] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <MapIcon className="w-3.5 h-3.5" />
                          {showMap ? 'Hide Map' : 'Adjust on Map'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Full Name */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Full name *</label>
                        <input
                          type="text"
                          required
                          value={addressForm.fullName}
                          onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                          placeholder="e.g. Priya Sharma"
                          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                        />
                      </div>

                      {/* Mobile Number */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Mobile number *</label>
                        <input
                          type="tel"
                          required
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          placeholder="10-digit mobile number"
                          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                        />
                      </div>

                      {/* House / Flat / Building */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          House / Flat / Building *
                        </label>
                        <input
                          type="text"
                          required
                          value={addressForm.houseNo}
                          onChange={(e) => setAddressForm({ ...addressForm, houseNo: e.target.value })}
                          placeholder="Flat no., building name, or house number"
                          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                        />
                      </div>

                      {/* Street / Area */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-stone-700 block mb-1">Street / Road *</label>
                          <input
                            type="text"
                            required
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                            placeholder="Road name, lane, or street"
                            className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-stone-700 block mb-1">Area / Locality</label>
                          <input
                            type="text"
                            value={addressForm.area || ''}
                            onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                            placeholder="e.g. Indiranagar, Koramangala"
                            className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* City, State & PIN Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-stone-700 block mb-1">City *</label>
                          <input
                            type="text"
                            required
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            placeholder="e.g. Bengaluru"
                            className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-stone-700 block mb-1">State *</label>
                          <input
                            type="text"
                            required
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            placeholder="e.g. Karnataka"
                            className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-stone-700 block mb-1">PIN code *</label>
                          <input
                            type="text"
                            required
                            value={addressForm.pincode}
                            onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                            placeholder="6-digit PIN code"
                            className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Landmark (Optional) */}
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">
                          Landmark (optional)
                        </label>
                        <input
                          type="text"
                          value={addressForm.landmark || ''}
                          onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                          placeholder="Nearby school, metro station, or famous landmark"
                          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                        />
                      </div>

                      {/* Coordinates verification badge */}
                      {addressForm.latitude && addressForm.longitude && (
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center justify-between">
                          <span>
                            📍 Delivery coordinates verified: <strong>{addressForm.latitude.toFixed(4)}, {addressForm.longitude.toFixed(4)}</strong>
                          </span>
                          <span className="uppercase text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                            {addressForm.addressSource}
                          </span>
                        </div>
                      )}
                    </div>

                    {user?.addresses && user.addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(false)}
                        className="text-stone-500 hover:underline pt-2 inline-block font-semibold"
                      >
                        &larr; Choose from saved addresses
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-4">
              <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
                <CreditCard className="w-5 h-5 text-[#832729]" /> 2. Payment Method
              </h3>

              <div className="space-y-3">
                {/* Razorpay Online */}
                <div
                  onClick={() => setPaymentMethod('RAZORPAY')}
                  className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === 'RAZORPAY'
                      ? 'border-[#832729] bg-[#832729]/5'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#832729]/10 text-[#832729] flex items-center justify-center font-bold">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-stone-900">
                        Online Payment (UPI, Debit/Credit Cards, Net Banking)
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Secured by Razorpay. 100% encrypted & trusted checkout.
                      </p>
                    </div>
                  </div>
                  {paymentMethod === 'RAZORPAY' && <CheckCircle2 className="w-5 h-5 text-[#832729]" />}
                </div>

                {/* Cash on Delivery */}
                {settings.codAvailable && (
                  <div
                    onClick={() => setPaymentMethod('COD')}
                    className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                      paymentMethod === 'COD'
                        ? 'border-[#832729] bg-[#832729]/5'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-stone-900">Cash on Delivery (COD)</p>
                        <p className="text-[11px] text-stone-500">Pay cash upon delivery at your doorstep.</p>
                      </div>
                    </div>
                    {paymentMethod === 'COD' && <CheckCircle2 className="w-5 h-5 text-[#832729]" />}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
              <h3 className="font-serif text-lg font-bold text-stone-900">Order Summary</h3>

              {/* Items List preview */}
              <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-stone-100 pr-1">
                {cartItems.map((item) => (
                  <div key={item._id || item.variant?._id} className="pt-2 first:pt-0 flex justify-between text-xs">
                    <div>
                      <p className="font-semibold text-stone-800 line-clamp-1">{item.product?.name}</p>
                      <p className="text-[11px] text-stone-500">
                        {item.size} / {item.color} &times; {item.quantity}
                      </p>
                    </div>
                    <span className="font-bold text-stone-900">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Pricing breakdown */}
              <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-stone-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-stone-900">
                    {isFreeDelivery ? <span className="text-emerald-700 font-bold">FREE</span> : `₹${deliveryCharge}`}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                <span className="font-serif text-base font-bold text-stone-900">Grand Total</span>
                <span className="font-serif text-2xl font-bold text-[#832729]">₹{grandTotal}</span>
              </div>

              {orderError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{orderError}</span>
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={orderProcessing}
                className="w-full py-4 bg-[#832729] text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-[#6E1F21] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#832729]/25 disabled:bg-stone-400 cursor-pointer"
              >
                {orderProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : paymentMethod === 'COD' ? (
                  'Confirm & Place Order'
                ) : (
                  `Pay ₹${grandTotal} Securely`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
