import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  CreditCard,
  Banknote,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Navigation,
  Loader2,
  Map as MapIcon,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import api from '../services/api';
import { Address } from '../types';
import { DeliveryLocationMap } from '../components/checkout/DeliveryLocationMap';
import { getImageUrl, handleImageError } from '../utils/imageUrl';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, subtotal, coupon, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { settings } = useStoreSettings();

  // Guest Customer Details
  const [customerEmail, setCustomerEmail] = useState('');

  // Address form states
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);
  const [showNewAddressForm, setShowNewAddressForm] = useState(true);
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
  const deliveryCharge = isFreeDelivery ? 0 : (settings.deliveryCharge ?? 99);
  const discountAmount = coupon?.discountAmount || 0;
  const grandTotal = Math.max(0, subtotal + deliveryCharge - discountAmount);

  // Prefill address form with user details if logged in
  useEffect(() => {
    if (user) {
      if (user.email) setCustomerEmail((prev) => prev || user.email);
      setAddressForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        phone: prev.phone || user.phone || ''
      }));
      if (user.addresses && user.addresses.length > 0) {
        setShowNewAddressForm(false);
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
        <p className="text-xs text-stone-500 mb-6">Your shopping bag is currently empty.</p>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 bg-[#832729] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#6E1F21] transition-colors"
        >
          Explore Collections
        </Link>
      </div>
    );
  }

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

      if (res.data?.success && res.data?.data) {
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

  // Handle Placing Order (Guest or Logged In)
  const handlePlaceOrder = async () => {
    setOrderError('');
    setOrderProcessing(true);

    try {
      // Validate customer email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!customerEmail || !emailRegex.test(customerEmail.trim())) {
        throw new Error('Please enter a valid email address for order confirmation and invoice receipts.');
      }

      // Determine shipping address
      let shippingAddress: Address;
      if (user?.addresses && user.addresses.length > 0 && !showNewAddressForm) {
        shippingAddress = user.addresses[selectedAddressIndex];
      } else {
        if (!addressForm.fullName || !addressForm.fullName.trim()) {
          throw new Error('Please enter your full name.');
        }

        const phoneDigits = addressForm.phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
          throw new Error('Please enter a valid 10-digit mobile number.');
        }

        if (
          !addressForm.houseNo?.trim() ||
          !addressForm.street?.trim() ||
          !addressForm.city?.trim() ||
          !addressForm.pincode?.trim()
        ) {
          throw new Error('Please fill all required delivery address fields (House/Flat, Street, City, and PIN code).');
        }

        if (addressForm.pincode.trim().length < 5) {
          throw new Error('Please enter a valid PIN code.');
        }

        shippingAddress = {
          fullName: addressForm.fullName.trim(),
          phone: phoneDigits,
          houseNo: addressForm.houseNo.trim(),
          street: addressForm.street.trim(),
          area: addressForm.area?.trim() || '',
          landmark: addressForm.landmark?.trim() || '',
          city: addressForm.city.trim(),
          state: addressForm.state.trim() || 'Karnataka',
          pincode: addressForm.pincode.trim(),
          isDefault: true,
          latitude: addressForm.latitude,
          longitude: addressForm.longitude,
          formattedAddress: addressForm.formattedAddress || `${addressForm.houseNo}, ${addressForm.street}, ${addressForm.city}`,
          addressSource: addressForm.addressSource
        };
      }

      // Prepare order items
      const itemsPayload = cartItems.map((item) => ({
        variantId: item.variant._id,
        quantity: item.quantity
      }));

      // Customer info snapshot
      const customerInfo = {
        name: shippingAddress.fullName,
        email: customerEmail.trim().toLowerCase(),
        phone: shippingAddress.phone
      };

      // Create order on backend (Guest supported!)
      const res = await api.post('/orders', {
        items: itemsPayload,
        shippingAddress,
        customerInfo,
        paymentMethod,
        couponCode: coupon?.code || null
      });

      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to place order');
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
          // Fallback if Razorpay script not loaded
          clearCart();
          navigate(`/order-success/${order._id}`);
          return;
        }

        const options = {
          key: razorpayKey,
          amount: Math.round(grandTotal * 100),
          currency: 'INR',
          name: settings.shopName || 'Aura Fashion',
          description: `Order ${order.orderNumber}`,
          image: settings.logoUrl || '/logo-dark.png',
          order_id: razorpayOrder?.id,
          prefill: {
            name: customerInfo.name,
            email: customerInfo.email,
            contact: customerInfo.phone
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

              if (verifyRes.data?.success) {
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
              setOrderError('Payment process was cancelled. You can retry placing your order.');
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900">Guest Checkout</h1>
        <p className="text-xs text-stone-500 mt-1">
          Complete your purchase quickly without creating an account. All order tracking and receipts will be sent to your email and phone.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left 2 Columns: Customer Details, Delivery Address & Payment */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Contact Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-5">
            <div className="pb-3 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#832729]" /> 1. Customer Information
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Your order confirmation and tax invoice will be sent to this email.
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                No Account Needed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Mobile Number (10 digits) *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-stone-700 block mb-1">Email Address (for order receipts & tracking) *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Address Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#832729]" /> 2. Delivery Address
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Use GPS to detect your location or enter your address details manually.
                </p>
              </div>

              {user?.addresses && user.addresses.length > 0 && !showNewAddressForm && (
                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className="text-xs font-bold text-[#832729] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Enter Different Address
                </button>
              )}
            </div>

            {/* Saved Addresses List (If customer previously had saved addresses) */}
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
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(true)}
                  className="text-xs font-bold text-[#832729] hover:underline flex items-center gap-1.5 pt-1"
                >
                  <Navigation className="w-3.5 h-3.5" /> Enter a new delivery address
                </button>
              </div>
            ) : (
              /* Address Setup: GPS + Manual Entry */
              <div className="space-y-6">
                {/* Option 1: Use Current Location (GPS) */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Navigation className="w-3.5 h-3.5 fill-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-serif text-sm font-bold text-stone-900">
                        Fast Doorstep Detection (GPS)
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        Click below to automatically detect your coordinates and fill address fields.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating || reverseGeocoding}
                    className="w-full py-3 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLocating || reverseGeocoding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isLocating ? 'Detecting GPS Coordinates...' : 'Resolving Street & City Details...'}</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 fill-white" />
                        <span>Use My Current Location</span>
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
                          You can easily fill in your delivery details in the manual fields below.
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

                {/* Interactive Map Component */}
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

                {/* Manual Address Fields */}
                <div className="pt-4 border-t border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-sm font-bold text-stone-900">
                        Delivery Address Details
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        All fields are fully editable at any time.
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
                        placeholder="Flat no., house number, or building name"
                        className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                      />
                    </div>

                    {/* Street & Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">Street / Road *</label>
                        <input
                          type="text"
                          required
                          value={addressForm.street}
                          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                          placeholder="Road, street, or lane name"
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

                    {/* City, State & PIN code */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="Bengaluru"
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
                          placeholder="Karnataka"
                          className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-stone-700 block mb-1">PIN code *</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={addressForm.pincode}
                          onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          placeholder="560038"
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
                        placeholder="Nearby landmark, metro station, or school"
                        className="w-full px-3 py-2.5 border border-stone-300 rounded-lg focus:ring-1 focus:ring-[#832729] focus:outline-none"
                      />
                    </div>

                    {/* Coordinates confirmation */}
                    {addressForm.latitude && addressForm.longitude && (
                      <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 flex items-center justify-between">
                        <span>
                          📍 Doorstep GPS coordinates captured: <strong>{addressForm.latitude.toFixed(4)}, {addressForm.longitude.toFixed(4)}</strong>
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
                      className="text-stone-500 hover:underline pt-2 inline-block font-semibold text-xs"
                    >
                      &larr; Choose from saved addresses
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Payment Method Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
              <CreditCard className="w-5 h-5 text-[#832729]" /> 3. Payment Method
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
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4 sticky top-24">
            <h3 className="font-serif text-lg font-bold text-stone-900">Order Summary</h3>

            {/* Items List preview */}
            <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-stone-100 pr-1">
              {cartItems.map((item) => {
                const itemImg = item.product?.images?.find((i) => i.isPrimary)?.url || item.product?.images?.[0]?.url || '';
                return (
                  <div key={item._id || item.variant?._id} className="pt-2.5 first:pt-0 flex gap-3 text-xs">
                    <img
                      src={getImageUrl(itemImg)}
                      alt={item.product?.name || 'Product'}
                      onError={handleImageError}
                      className="w-12 h-14 object-cover rounded bg-stone-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-800 line-clamp-1">
                        {item.product?.name}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {item.size} / {item.color} &times; {item.quantity}
                      </p>
                      <p className="font-bold text-stone-900 mt-0.5">₹{item.price * item.quantity}</p>
                    </div>
                  </div>
                );
              })}
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
                'Place Order (Cash on Delivery)'
              ) : (
                `Pay ₹${grandTotal} Securely`
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-stone-400 flex items-center justify-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-stone-400" />
                Dispatched with care from Aura Fashion, Bengaluru
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
