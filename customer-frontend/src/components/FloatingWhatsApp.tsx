import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export const FloatingWhatsApp: React.FC = () => {
  const { settings } = useStoreSettings();
  const phone = settings.whatsappNumber || '7022018850';
  const message = encodeURIComponent(`Hello Aura Fashion! I have an enquiry regarding your clothing collection.`);
  const whatsappUrl = `https://wa.me/91${phone}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 group transition-all duration-300 hover:scale-105"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-6 h-6 fill-white" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-semibold uppercase tracking-wider pr-1">
        Chat with Us
      </span>
    </a>
  );
};
