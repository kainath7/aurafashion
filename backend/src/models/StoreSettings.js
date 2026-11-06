import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      default: 'Aura Fashion',
      required: true
    },
    ownerName: {
      type: String,
      default: 'Kainath',
      required: true
    },
    shopAddress: {
      type: String,
      default: 'Bengaluru',
      required: true
    },
    shopLocation: {
      type: String,
      default: 'Bengaluru, Karnataka, India',
      required: true
    },
    contactNumber: {
      type: String,
      default: '7022018850',
      required: true
    },
    whatsappNumber: {
      type: String,
      default: '7022018850',
      required: true
    },
    email: {
      type: String,
      default: 'shoppe.aurafashion@gmail.com',
      required: true
    },
    tagline: {
      type: String,
      default: 'Curated Elegance & Modern Clothing'
    },
    logoUrl: {
      type: String,
      default: ''
    },
    announcementText: {
      type: String,
      default: '✨ Free express shipping on orders over ₹1,499 | New Season Collection Live!'
    },
    deliveryCharge: {
      type: Number,
      default: 99
    },
    freeDeliveryThreshold: {
      type: Number,
      default: 1499
    },
    codAvailable: {
      type: Boolean,
      default: true
    },
    codExtraCharge: {
      type: Number,
      default: 0
    },
    primaryColor: {
      type: String,
      default: '#832729' // Elegant Deep Berry / Crimson
    },
    accentColor: {
      type: String,
      default: '#D4AF37' // Rich Gold
    },
    returnPolicy: {
      type: String,
      default: 'Easy 7-day hassle-free returns from delivery date for unworn items with original tags intact.'
    },
    exchangePolicy: {
      type: String,
      default: 'Instant size and colour exchanges available within 7 days of delivery.'
    },
    refundPolicy: {
      type: String,
      default: 'Refunds are initiated within 48 hours of returned item verification to the original payment source.'
    },
    businessHours: {
      type: String,
      default: 'Mon - Sat: 10:00 AM - 8:30 PM | Sun: 11:00 AM - 7:00 PM'
    },
    socialLinks: {
      instagram: { type: String, default: 'https://instagram.com/aurafashion' },
      facebook: { type: String, default: 'https://facebook.com/aurafashion' },
      whatsapp: { type: String, default: 'https://wa.me/917022018850' }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('StoreSettings', storeSettingsSchema);
