import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    emailType: {
      type: String,
      required: true,
      enum: [
        'WELCOME',
        'ORDER_CONFIRMATION',
        'PAYMENT_CONFIRMATION',
        'ORDER_STATUS_UPDATE',
        'ORDER_SHIPPED',
        'ORDER_DELIVERED',
        'ORDER_CANCELLED',
        'REFUND_PROCESSED',
        'PASSWORD_RESET',
        'ADMIN_NEW_ORDER',
        'ADMIN_LOW_STOCK',
        'ADMIN_ORDER_CANCELLED',
        'TEST_EMAIL'
      ]
    },
    subject: {
      type: String,
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    orderNumber: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['SENT', 'FAILED', 'RETRYING', 'SKIPPED'],
      default: 'SENT'
    },
    attempts: {
      type: Number,
      default: 1
    },
    error: {
      type: String,
      default: null
    },
    messageId: {
      type: String,
      default: null
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

emailLogSchema.index({ recipient: 1, emailType: 1, orderId: 1, createdAt: -1 });

export default mongoose.model('EmailLog', emailLogSchema);
