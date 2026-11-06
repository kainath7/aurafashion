import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Variant must belong to a product']
    },
    size: {
      type: String,
      required: [true, 'Size is required (e.g. S, M, L, XL, Free Size)'],
      trim: true
    },
    color: {
      type: String,
      required: [true, 'Color name is required (e.g. Navy Blue, Wine Red, Jet Black)'],
      trim: true
    },
    colorCode: {
      type: String,
      default: '#000000',
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required for each variant'],
      unique: true,
      trim: true
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    additionalPrice: {
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

// Compound index to guarantee uniqueness of size + color combination per product
productVariantSchema.index({ product: 1, size: 1, color: 1 }, { unique: true });

export default mongoose.model('ProductVariant', productVariantSchema);
