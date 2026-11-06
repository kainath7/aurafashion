import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import EmailLog from '../models/EmailLog.js';
import Order from '../models/Order.js';
import StoreSettings from '../models/StoreSettings.js';
import {
  welcomeEmailTemplate,
  orderConfirmationTemplate,
  paymentConfirmationTemplate,
  orderStatusUpdateTemplate,
  orderCancelledTemplate,
  refundProcessedTemplate,
  passwordResetTemplate,
  adminNewOrderTemplate,
  adminLowStockTemplate,
  adminOrderCancelledAlertTemplate
} from './emailTemplates.js';

let transporterInstance = null;

// Create and cache Nodemailer transporter
const getTransporter = () => {
  if (!transporterInstance) {
    const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
    const port = Number(process.env.EMAIL_PORT) || 587;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  return transporterInstance;
};

// Verify SMTP connectivity
export const verifySmtpConnection = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP connection successfully verified with server' };
  } catch (error) {
    console.warn('[Email Warning] SMTP verification check failed:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Base email dispatcher with logging, duplicate prevention, and non-blocking safety
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  emailType,
  orderId = null,
  orderNumber = null,
  metadata = {}
}) => {
  const recipient = to?.trim()?.toLowerCase();
  if (!recipient) {
    console.warn(`[Email Warning] Cannot send ${emailType} email: No recipient provided.`);
    return { success: false, error: 'Recipient email is required' };
  }

  // 1. Check Store Settings Notification Preferences
  try {
    const settings = await StoreSettings.findOne();
    const prefs = settings?.notifications || {};

    if (emailType === 'ORDER_CONFIRMATION' && prefs.orderConfirmationEmail === false) {
      await logEmail({ recipient, emailType, subject, orderId, orderNumber, status: 'SKIPPED', error: 'Disabled in admin preferences' });
      return { success: true, skipped: true, reason: 'Disabled by admin' };
    }
    if (emailType === 'PAYMENT_CONFIRMATION' && prefs.paymentConfirmationEmail === false) {
      await logEmail({ recipient, emailType, subject, orderId, orderNumber, status: 'SKIPPED', error: 'Disabled in admin preferences' });
      return { success: true, skipped: true, reason: 'Disabled by admin' };
    }
    if (emailType.startsWith('ORDER_') && prefs.orderStatusEmail === false) {
      await logEmail({ recipient, emailType, subject, orderId, orderNumber, status: 'SKIPPED', error: 'Disabled in admin preferences' });
      return { success: true, skipped: true, reason: 'Disabled by admin' };
    }
    if (emailType === 'ADMIN_NEW_ORDER' && prefs.adminNewOrderAlert === false) {
      await logEmail({ recipient, emailType, subject, orderId, orderNumber, status: 'SKIPPED', error: 'Disabled in admin preferences' });
      return { success: true, skipped: true, reason: 'Disabled by admin' };
    }
    if (emailType === 'ADMIN_LOW_STOCK' && prefs.adminLowStockAlert === false) {
      await logEmail({ recipient, emailType, subject, orderId, orderNumber, status: 'SKIPPED', error: 'Disabled in admin preferences' });
      return { success: true, skipped: true, reason: 'Disabled by admin' };
    }
  } catch (err) {
    // Continue if settings lookup fails
  }

  // 2. Duplicate Email Prevention for Orders
  if (orderId && ['ORDER_CONFIRMATION', 'PAYMENT_CONFIRMATION'].includes(emailType)) {
    try {
      const recentLog = await EmailLog.findOne({
        orderId,
        emailType,
        status: 'SENT',
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // within 1 hour
      });

      if (recentLog) {
        console.log(`[Email] Skipped duplicate ${emailType} email for order ${orderNumber || orderId}`);
        return { success: true, skipped: true, reason: 'Duplicate prevented' };
      }
    } catch (err) {
      // Continue if duplicate check fails
    }
  }

  const fromAddress = process.env.EMAIL_FROM || 'Aura Fashion <shoppe.aurafashion@gmail.com>';
  const transporter = getTransporter();

  // 3. Dispatch with retry logic
  let attempts = 0;
  const maxAttempts = 2;
  let lastError = null;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        html,
        text
      });

      console.log(`[Email Sent] ${emailType} to ${recipient} | MessageId: ${info.messageId}`);

      // Log success
      await logEmail({
        recipient,
        emailType,
        subject,
        orderId,
        orderNumber,
        status: 'SENT',
        messageId: info.messageId,
        attempts,
        metadata
      });

      // Atomically track on Order document if orderId provided
      if (orderId && mongoose.connection?.readyState === 1) {
        try {
          await Order.findByIdAndUpdate(orderId, {
            $push: {
              sentEmails: {
                emailType,
                recipient,
                sentAt: new Date(),
                messageId: info.messageId
              }
            }
          });
        } catch (e) {
          // Non-blocking
        }
      }

      return { success: true, messageId: info.messageId };
    } catch (err) {
      lastError = err;
      console.warn(`[Email Attempt ${attempts}/${maxAttempts} Failed] ${emailType} to ${recipient}: ${err.message}`);
      if (attempts < maxAttempts) {
        // Wait 1 second before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Log permanent failure
  await logEmail({
    recipient,
    emailType,
    subject,
    orderId,
    orderNumber,
    status: 'FAILED',
    error: lastError?.message || 'SMTP send failure',
    attempts,
    metadata
  });

  return { success: false, error: lastError?.message };
};

// Helper to safely record EmailLog in MongoDB
const logEmail = async (data) => {
  try {
    if (mongoose.connection?.readyState === 1) {
      await EmailLog.create(data);
    }
  } catch (err) {
    console.warn('[EmailLog Warning] Could not record email log:', err.message);
  }
};

// ==========================================
// HIGH-LEVEL SERVICE CONVENIENCE METHODS
// ==========================================

// 1. Welcome Email
export const sendWelcomeEmail = async (user) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const { subject, html, text } = welcomeEmailTemplate({
    customerName: user.name,
    clientUrl
  });

  return sendEmail({
    to: user.email,
    subject,
    html,
    text,
    emailType: 'WELCOME',
    metadata: { userId: user._id }
  });
};

// 2. Order Confirmation / Placed Email
export const sendOrderConfirmationEmail = async (order) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const { subject, html, text } = orderConfirmationTemplate({
    order,
    clientUrl
  });

  return sendEmail({
    to: order.customerInfo?.email,
    subject,
    html,
    text,
    emailType: 'ORDER_CONFIRMATION',
    orderId: order._id,
    orderNumber: order.orderNumber
  });
};

// 3. Payment Confirmation Email (Razorpay)
export const sendPaymentConfirmationEmail = async (order) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const { subject, html, text } = paymentConfirmationTemplate({
    order,
    clientUrl
  });

  return sendEmail({
    to: order.customerInfo?.email,
    subject,
    html,
    text,
    emailType: 'PAYMENT_CONFIRMATION',
    orderId: order._id,
    orderNumber: order.orderNumber,
    metadata: {
      paymentId: order.paymentInfo?.razorpayPaymentId,
      paidAt: order.paymentInfo?.paidAt
    }
  });
};

// 4. Order Status Update Email
export const sendOrderStatusUpdateEmail = async ({
  order,
  previousStatus,
  newStatus,
  trackingNumber = '',
  comment = ''
}) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const { subject, html, text } = orderStatusUpdateTemplate({
    order,
    previousStatus,
    newStatus,
    trackingNumber: trackingNumber || order.trackingNumber,
    comment,
    clientUrl
  });

  let emailType = 'ORDER_STATUS_UPDATE';
  if (newStatus === 'SHIPPED') emailType = 'ORDER_SHIPPED';
  if (newStatus === 'DELIVERED') emailType = 'ORDER_DELIVERED';

  return sendEmail({
    to: order.customerInfo?.email,
    subject,
    html,
    text,
    emailType,
    orderId: order._id,
    orderNumber: order.orderNumber,
    metadata: { previousStatus, newStatus, trackingNumber, comment }
  });
};

// 5. Order Cancellation Email (Customer)
export const sendOrderCancelledEmail = async (order, reason = '') => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const { subject, html, text } = orderCancelledTemplate({
    order,
    reason,
    clientUrl
  });

  return sendEmail({
    to: order.customerInfo?.email,
    subject,
    html,
    text,
    emailType: 'ORDER_CANCELLED',
    orderId: order._id,
    orderNumber: order.orderNumber,
    metadata: { reason }
  });
};

// 6. Refund Processed Email
export const sendRefundProcessedEmail = async (order, refundAmount) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const { subject, html, text } = refundProcessedTemplate({
    order,
    refundAmount,
    clientUrl
  });

  return sendEmail({
    to: order.customerInfo?.email,
    subject,
    html,
    text,
    emailType: 'REFUND_PROCESSED',
    orderId: order._id,
    orderNumber: order.orderNumber,
    metadata: { refundAmount }
  });
};

// 7. Password Reset Email
export const sendPasswordResetEmail = async (user, rawToken) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

  const { subject, html, text } = passwordResetTemplate({
    customerName: user.name,
    resetUrl,
    expireMinutes: 20,
    clientUrl
  });

  return sendEmail({
    to: user.email,
    subject,
    html,
    text,
    emailType: 'PASSWORD_RESET',
    metadata: { userId: user._id }
  });
};

// 8. Admin: New Order Alert
export const sendAdminNewOrderAlert = async (order) => {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
  const settings = await StoreSettings.findOne().catch(() => null);
  const adminEmail = settings?.notifications?.adminNotificationEmail || process.env.ADMIN_EMAIL || 'shoppe.aurafashion@gmail.com';

  const { subject, html, text } = adminNewOrderTemplate({
    order,
    adminUrl
  });

  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    emailType: 'ADMIN_NEW_ORDER',
    orderId: order._id,
    orderNumber: order.orderNumber
  });
};

// 9. Admin: Low Stock Inventory Alert
export const sendAdminLowStockAlert = async ({ product, variant, currentStock }) => {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
  const settings = await StoreSettings.findOne().catch(() => null);
  const adminEmail = settings?.notifications?.adminNotificationEmail || process.env.ADMIN_EMAIL || 'shoppe.aurafashion@gmail.com';

  const { subject, html, text } = adminLowStockTemplate({
    product,
    variant,
    currentStock,
    adminUrl
  });

  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    emailType: 'ADMIN_LOW_STOCK',
    metadata: { productId: product._id, sku: variant.sku, currentStock }
  });
};

// 10. Admin: Order Cancelled by Customer Alert
export const sendAdminOrderCancelledAlert = async (order, reason = '') => {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
  const settings = await StoreSettings.findOne().catch(() => null);
  const adminEmail = settings?.notifications?.adminNotificationEmail || process.env.ADMIN_EMAIL || 'shoppe.aurafashion@gmail.com';

  const { subject, html, text } = adminOrderCancelledAlertTemplate({
    order,
    reason,
    adminUrl
  });

  return sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    emailType: 'ADMIN_ORDER_CANCELLED',
    orderId: order._id,
    orderNumber: order.orderNumber,
    metadata: { reason }
  });
};

export default {
  verifySmtpConnection,
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendOrderCancelledEmail,
  sendRefundProcessedEmail,
  sendPasswordResetEmail,
  sendAdminNewOrderAlert,
  sendAdminLowStockAlert,
  sendAdminOrderCancelledAlert
};
