import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { StoreSettings } from '../types';
import { getSocket } from '../services/socket';

interface StoreSettingsContextType {
  settings: StoreSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: StoreSettings = {
  shopName: 'Aura Fashion',
  ownerName: 'Kainath',
  shopAddress: 'Bengaluru',
  shopLocation: 'Bengaluru, Karnataka, India',
  contactNumber: '7022018850',
  whatsappNumber: '7022018850',
  email: 'shoppe.aurafashion@gmail.com',
  tagline: 'Curated Elegance & Modern Clothing',
  announcementText: '✨ Free express shipping on orders over ₹1,499 | New Season Live!',
  deliveryCharge: 99,
  freeDeliveryThreshold: 1499,
  codAvailable: true,
  codExtraCharge: 0,
  primaryColor: '#832729',
  accentColor: '#D4AF37',
  returnPolicy: 'Easy 7-day hassle-free returns from delivery date for unworn items with original tags intact.',
  exchangePolicy: 'Instant size and colour exchanges available within 7 days of delivery.',
  refundPolicy: 'Refunds are initiated within 48 hours of return verification to original payment source.',
  businessHours: 'Mon - Sat: 10:00 AM - 8:30 PM | Sun: 11:00 AM - 7:00 PM',
  socialLinks: {
    instagram: 'https://instagram.com/aurafashion',
    facebook: 'https://facebook.com/aurafashion',
    whatsapp: 'https://wa.me/917022018850'
  }
};

const StoreSettingsContext = createContext<StoreSettingsContextType>({
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {}
});

export const StoreSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data?.success && res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.warn('Using default Aura Fashion settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    const socket = getSocket();
    const handleSettingsUpdate = (updatedSettings: StoreSettings) => {
      if (updatedSettings && typeof updatedSettings === 'object') {
        setSettings(updatedSettings);
      } else {
        fetchSettings();
      }
    };

    socket.on('store_settings_updated', handleSettingsUpdate);
    return () => {
      socket.off('store_settings_updated', handleSettingsUpdate);
    };
  }, []);

  return (
    <StoreSettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => useContext(StoreSettingsContext);
