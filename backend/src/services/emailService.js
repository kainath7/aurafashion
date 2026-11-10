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
  adminOrderCancelledAlertTemplate,
  adminOtpTemplate
} from './emailTemplates.js';

let transporterInstance = null;
let activeWorkingPort = null;

// Parse "Name <email@domain.com>" sender strings for REST APIs
const parseSender = (fromStr) => {
  const fallbackEmail = 'shoppe.aurafashion@gmail.com';
  if (!fromStr) return { name: 'Aura Fashion', email: fallbackEmail };
  const match = fromStr.match(/^(?:([^<]+)\s*<)?([^>]+)>?$/);
  if (match) {
    return {
      name: (match[1] || 'Aura Fashion').trim(),
      email: (match[2] || fallbackEmail).trim()
    };
  }
  return { name: 'Aura Fashion', email: fromStr.trim() };
};

// Dispatch via Brevo Official HTTPS REST API (Port 443 - Bypasses all cloud hosting SMTP blocks)
const sendViaBrevoApi = async ({ apiKey, from, to, subject, html, text }) => {
  const sender = parseSender(from);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey.trim()
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to.trim().toLowerCase() }],
      subject,
      htmlContent: html,
      textContent: text || undefined
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Brevo API returned HTTP ${response.status}`);
  }

  return { messageId: data.messageId || `<brevo-api-${Date.now()}@brevo.com>` };
};

// Dispatch via Resend Official HTTPS REST API (Port 443 - Optional Alternative)
const sendViaResendApi = async ({ apiKey, from, to, subject, html, text }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({
      from,
      to: [to.trim().toLowerCase()],
      subject,
      html,
      text: text || undefined
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Resend API returned HTTP ${response.status}`);
  }

  return { messageId: data.id || `<resend-api-${Date.now()}@resend.com>` };
};

// Create Nodemailer transporter with port auto-selection (2525 / 587)
const createTransporter = (targetPort) => {
  const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
  const port = targetPort || activeWorkingPort || Number(process.env.EMAIL_PORT) || 2525;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });
};

const getTransporter = (port) => {
  if (port || !transporterInstance) {
    const t = createTransporter(port);
    if (!port) transporterInstance = t;
    return t;
  }
  return transporterInstance;
};

// Verify email delivery connectivity (HTTPS API or SMTP)
export const verifySmtpConnection = async () => {
  const brevoApiKey = process.env.BREVO_API_KEY || (process.env.EMAIL_PASS?.startsWith('xkeysib-') ? process.env.EMAIL_PASS : null);
  if (brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': brevoApiKey.trim() }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: `Brevo HTTPS API (Port 443) connected successfully! Account: ${data.email || 'Active'}` };
      }
      return { success: false, message: data.message || `Brevo API returned HTTP ${res.status}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

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
  const brevoApiKey = process.env.BREVO_API_KEY || (process.env.EMAIL_PASS?.startsWith('xkeysib-') ? process.env.EMAIL_PASS : null);
  const resendApiKey = process.env.RESEND_API_KEY;

  // 3. Priority 1: Dispatch via Brevo HTTPS REST API (Port 443 - zero firewall timeout)
  if (brevoApiKey) {
    try {
      const info = await sendViaBrevoApi({
        apiKey: brevoApiKey,
        from: fromAddress,
        to: recipient,
        subject,
        html,
        text
      });

      console.log(`[Email Sent via Brevo HTTPS API] ${emailType} to ${recipient} | MessageId: ${info.messageId}`);
      await logEmail({
        recipient,
        emailType,
        subject,
        orderId,
        orderNumber,
        status: 'SENT',
        messageId: info.messageId,
        attempts: 1,
        metadata
      });

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
    } catch (apiErr) {
      console.warn(`[Brevo API Error] ${emailType} to ${recipient}: ${apiErr.message}`);
      // Fall through to SMTP if API fails
    }
  } else if (resendApiKey) {
    try {
      const info = await sendViaResendApi({
        apiKey: resendApiKey,
        from: fromAddress,
        to: recipient,
        subject,
        html,
        text
      });

      console.log(`[Email Sent via Resend HTTPS API] ${emailType} to ${recipient} | MessageId: ${info.messageId}`);
      await logEmail({
        recipient,
        emailType,
        subject,
        orderId,
        orderNumber,
        status: 'SENT',
        messageId: info.messageId,
        attempts: 1,
        metadata
      });

      return { success: true, messageId: info.messageId };
    } catch (apiErr) {
      console.warn(`[Resend API Error] ${emailType} to ${recipient}: ${apiErr.message}`);
    }
  }

  // 4. Priority 2: Nodemailer SMTP with Smart Port Failover (2525 -> 587)
  const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
  const configuredPort = Number(process.env.EMAIL_PORT) || 2525;
  const portsToTry = host.includes('brevo.com')
    ? (configuredPort === 587 ? [2525, 587] : [configuredPort, 2525])
    : [configuredPort];

  let lastError = null;
  let attempts = 0;

  for (const port of portsToTry) {
    attempts++;
    try {
      const transporter = getTransporter(port);
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        html,
        text
      });

      activeWorkingPort = port;
      console.log(`[Email Sent via SMTP:${port}] ${emailType} to ${recipient} | MessageId: ${info.messageId}`);

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
        metadata: { ...metadata, port }
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
      console.warn(`[Email SMTP Port ${port} Failed] ${emailType} to ${recipient}: ${err.message}`);
      if (attempts < portsToTry.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  // Check if error is due to Render Free firewall blocking SMTP
  let friendlyError = lastError?.message || 'SMTP send failure';
  if (
    lastError &&
    (lastError.message?.toLowerCase().includes('timeout') ||
      lastError.code === 'ETIMEDOUT' ||
      lastError.code === 'ECONNREFUSED')
  ) {
    friendlyError =
      'Cloud hosting (Render Free) blocked outbound SMTP ports. To bypass this instantly: Generate a free Brevo API Key (starts with xkeysib-) in Brevo > SMTP & API > API Keys, and add it to Render Environment Variables as BREVO_API_KEY (sends via HTTPS Port 443).';
  }

  // Log permanent failure
  await logEmail({
    recipient,
    emailType,
    subject,
    orderId,
    orderNumber,
    status: 'FAILED',
    error: friendlyError,
    attempts,
    metadata
  });

  return { success: false, error: friendlyError };
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
export const sendPasswordResetEmail = async (user, rawToken, originUrl = null) => {
  let clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  if (originUrl && (originUrl.startsWith('http://localhost') || originUrl.startsWith('https://'))) {
    clientUrl = originUrl.replace(/\/+$/, '');
  }
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

// 11. Admin: Security OTP Email
export const sendAdminOtpEmail = async ({ admin, otpCode, purpose = 'Password Recovery', expireMinutes = 5 }) => {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:5174';
  const { subject, html, text } = adminOtpTemplate({
    adminName: admin.name,
    otpCode,
    purpose,
    expireMinutes,
    adminUrl
  });

  return sendEmail({
    to: admin.email,
    subject,
    html,
    text,
    emailType: 'ADMIN_OTP_VERIFICATION',
    metadata: { adminId: admin._id, purpose }
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
  sendAdminOrderCancelledAlert,
  sendAdminOtpEmail
};
