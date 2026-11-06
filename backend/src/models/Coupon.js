import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED', 'FLAT'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: [1, 'Discount value must be at least 1']
    },
    minOrderValue: {
      type: Number,
      default: 0
    },
    maxDiscountAmount: {
      type: Number,
      default: null // null for unlimited (or fixed)
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      required: true
    },
    usageLimit: {
      type: Number,
      default: 1000
    },
    usedCount: {
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

export default mongoose.model('Coupon', couponSchema);
