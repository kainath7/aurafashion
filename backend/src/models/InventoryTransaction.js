import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['PURCHASE', 'MANUAL_ADJUSTMENT', 'RESTOCK', 'CANCELLED_RETURN', 'INITIAL_STOCK'],
      required: true
    },
    quantityDelta: {
      type: Number,
      required: true
    },
    previousStock: {
      type: Number,
      required: true
    },
    newStock: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    performedBy: {
      type: String,
      default: 'Admin'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);
