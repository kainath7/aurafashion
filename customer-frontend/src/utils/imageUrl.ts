// Utility for robust product image URL resolution & fallbacks
const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80';

export const getImageUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  const trimmed = url.trim();

  // Already a full remote URL (Cloudinary, Unsplash, CDN, or data URI)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Relative path uploaded to backend (e.g. /uploads/filename.webp)
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${BACKEND_BASE}${cleanPath}`;
};

export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = FALLBACK_PRODUCT_IMAGE
) => {
  const target = e.currentTarget;
  if (target.src !== fallbackSrc) {
    target.onerror = null;
    target.src = fallbackSrc;
  }
};
