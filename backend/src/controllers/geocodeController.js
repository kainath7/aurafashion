import axios from 'axios';

// In-memory cache for reverse-geocoding queries to respect provider rate-limits
// Key format: `${roundedLat},${roundedLng}` (rounded to 4 decimals ~ 11m precision)
const geocodeCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
const MAX_CACHE_ENTRIES = 500;

const cleanupCache = () => {
  if (geocodeCache.size > MAX_CACHE_ENTRIES) {
    const oldestKeys = Array.from(geocodeCache.keys()).slice(0, 100);
    oldestKeys.forEach((k) => geocodeCache.delete(k));
  }
};

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim with fail-safe caching
 * and comprehensive Indian address field extraction.
 */
export const reverseGeocodeController = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (lat) and longitude (lng) query parameters are required.'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude. Must be a decimal between -90 and 90.'
      });
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude. Must be a decimal between -180 and 180.'
      });
    }

    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = geocodeCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        success: true,
        source: 'CACHE',
        data: cached.data
      });
    }

    // Call OpenStreetMap Nominatim API with compliant User-Agent
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`;

    let responseData = null;

    try {
      const response = await axios.get(nominatimUrl, {
        headers: {
          'User-Agent': 'AuraFashion-Ecommerce/1.0 (shoppe.aurafashion@gmail.com)',
          'Accept-Language': 'en-IN,en;q=0.9'
        },
        timeout: 6000
      });
      responseData = response.data;
    } catch (primaryErr) {
      console.warn('[Geocode Warning] Nominatim fetch failed:', primaryErr.message);
      // Secondary fallback endpoint
      try {
        const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
        const fbRes = await axios.get(fallbackUrl, { timeout: 5000 });
        const fb = fbRes.data;

        const parsedFallback = {
          houseNo: '',
          street: fb.locality || '',
          area: fb.principalSubdivisionDescription || fb.locality || '',
          city: fb.city || fb.locality || 'Bengaluru',
          state: fb.principalSubdivision || 'Karnataka',
          pincode: fb.postcode || '',
          formattedAddress: [fb.locality, fb.city, fb.principalSubdivision, fb.countryName]
            .filter(Boolean)
            .join(', '),
          latitude,
          longitude
        };

        return res.json({
          success: true,
          source: 'FALLBACK_PROVIDER',
          data: parsedFallback
        });
      } catch (fallbackErr) {
        return res.status(502).json({
          success: false,
          message: 'Unable to reverse geocode coordinates at this time. Please enter address manually.',
          coordinates: { latitude, longitude }
        });
      }
    }

    if (!responseData || !responseData.address) {
      return res.status(404).json({
        success: false,
        message: 'No address details found for these coordinates.',
        coordinates: { latitude, longitude }
      });
    }

    const addr = responseData.address;

    // Structured parsing optimized for Indian addresses and general worldwide locations
    const buildingOrHouse =
      addr.house_number ||
      addr.building ||
      addr.apartment ||
      addr.flats ||
      addr.premise ||
      addr.amenity ||
      '';

    const street =
      addr.road ||
      addr.pedestrian ||
      addr.footway ||
      addr.street ||
      addr.path ||
      addr.neighbourhood ||
      '';

    const area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.residential ||
      addr.city_district ||
      addr.district ||
      '';

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      'Bengaluru';

    const state = addr.state || 'Karnataka';
    const pincode = addr.postcode || '';

    const parsedData = {
      houseNo: buildingOrHouse,
      street: street,
      area: area,
      landmark: addr.landmark || addr.amenity || '',
      city: city,
      state: state,
      pincode: pincode,
      country: addr.country || 'India',
      formattedAddress: responseData.display_name || '',
      latitude,
      longitude
    };

    // Store in cache
    cleanupCache();
    geocodeCache.set(cacheKey, {
      data: parsedData,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      source: 'NOMINATIM',
      data: parsedData
    });
  } catch (error) {
    next(error);
  }
};
