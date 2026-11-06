import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subtitle: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      default: ''
    },
    linkUrl: {
      type: String,
      default: '/shop'
    },
    buttonText: {
      type: String,
      default: 'Shop Collection'
    },
    position: {
      type: String,
      enum: ['HERO', 'PROMO', 'FEATURED_GRID'],
      default: 'HERO'
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Banner', bannerSchema);
