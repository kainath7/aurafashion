import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Info } from 'lucide-react';

interface DeliveryLocationMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  addressPreview?: string;
  accuracy?: number | null;
  onRecenter?: () => void;
  isDetecting?: boolean;
}

// Custom luxury Aura Fashion Map Pin
const createDeliveryPinIcon = () => {
  return L.divIcon({
    className: 'aura-delivery-pin',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
        <div style="position: absolute; width: 34px; height: 34px; background: #832729; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);"></div>
        <div style="position: relative; width: 12px; height: 12px; background: #D4AF37; border: 1.5px solid #ffffff; border-radius: 50%; z-index: 2; margin-top: -6px;"></div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
  });
};

export const DeliveryLocationMap: React.FC<DeliveryLocationMapProps> = ({
  latitude,
  longitude,
  onLocationChange,
  addressPreview,
  accuracy,
  onRecenter,
  isDetecting = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        scrollWheelZoom: false, // Prevents accidental scroll trapping on mobile
        touchZoom: true,
        dragging: true
      });

      // CartoDB Voyager or OpenStreetMap standard tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Add draggable pin marker
      const pinIcon = createDeliveryPinIcon();
      const marker = L.marker([latitude, longitude], {
        icon: pinIcon,
        draggable: true,
        autoPan: true
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
          <strong style="color: #832729;">📍 Delivery Destination</strong>
          <p style="margin: 4px 0 0 0; color: #444; font-size: 11px;">Drag this pin to your exact entrance or doorstep.</p>
        </div>
      `);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onLocationChange(position.lat, position.lng);
      });

      // Map Click to reposition marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onLocationChange(e.latlng.lat, e.latlng.lng);
      });

      // Accuracy circle if accuracy is supplied
      if (accuracy && accuracy > 0 && accuracy < 500) {
        const circle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 0.12,
          weight: 1.5
        }).addTo(map);
        accuracyCircleRef.current = circle;
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        accuracyCircleRef.current = null;
      }
    };
  }, []);

  // Update map view and marker position when lat/lng change from parent
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const currentMarkerPos = markerRef.current.getLatLng();
      const dist = Math.sqrt(
        Math.pow(currentMarkerPos.lat - latitude, 2) + Math.pow(currentMarkerPos.lng - longitude, 2)
      );

      // Only re-pan if position changed significantly
      if (dist > 0.00005) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom(), {
          animate: true
        });
      }

      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        if (accuracy) {
          accuracyCircleRef.current.setRadius(accuracy);
        }
      }
    }
  }, [latitude, longitude, accuracy]);

  return (
    <div className="space-y-2">
      {/* Map Header Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 text-stone-700 font-medium">
          <Info className="w-4 h-4 text-[#832729] shrink-0" />
          <span>Drag the pin or tap the map to fine-tune your exact doorstep or building entrance.</span>
        </div>

        {onRecenter && (
          <button
            type="button"
            onClick={onRecenter}
            disabled={isDetecting}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <Navigation className="w-3 h-3" />
            {isDetecting ? 'Locating...' : 'Recenter GPS'}
          </button>
        )}
      </div>

      {/* Interactive Map Box */}
      <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-stone-300 shadow-inner z-0">
        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

        {/* Address badge floating over map bottom */}
        {addressPreview && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-sm p-2.5 rounded-lg border border-stone-200 shadow-md text-xs z-[400] flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="font-bold text-stone-900 block truncate">📍 {addressPreview}</span>
              <span className="text-[10px] text-stone-500 font-mono">
                Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
                {accuracy ? ` (&plusmn;${Math.round(accuracy)}m)` : ''}
              </span>
            </div>
            <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#832729]/10 text-[#832729]">
              Pin Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
