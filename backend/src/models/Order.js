import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
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
    productName: { type: String, required: true },
    productImage: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true }
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'PACKED',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'RETURNED'
      ],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    comment: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: String,
      default: 'System'
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    customerInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true }
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      houseNo: { type: String, required: true },
      street: { type: String, required: true },
      area: { type: String, default: '' },
      landmark: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      deliveryInstructions: { type: String, default: '' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      formattedAddress: { type: String, default: '' },
      addressSource: {
        type: String,
        enum: ['GPS', 'MANUAL', 'MAP_PICKER'],
        default: 'MANUAL'
      }
    },
    items: [orderItemSchema],
    pricing: {
      itemsTotal: { type: Number, required: true },
      deliveryCharge: { type: Number, required: true, default: 0 },
      couponCode: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true }
    },
    paymentMethod: {
      type: String,
      enum: ['RAZORPAY', 'COD'],
      required: true
    },
    paymentInfo: {
      razorpayOrderId: { type: String, default: '' },
      razorpayPaymentId: { type: String, default: '' },
      razorpaySignature: { type: String, default: '' },
      status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
        default: 'PENDING'
      },
      paidAt: { type: Date }
    },
    orderStatus: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'PACKED',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'RETURNED'
      ],
      default: 'PENDING'
    },
    statusHistory: [statusHistorySchema],
    trackingNumber: { type: String, default: '' },
    notes: { type: String, default: '' },
    sentEmails: [
      {
        emailType: { type: String, required: true },
        recipient: { type: String },
        sentAt: { type: Date, default: Date.now },
        messageId: { type: String }
      }
    ]
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Order', orderSchema);
