import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

export const getRazorpayInstance = () => {
  if (!razorpayInstance && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
    } catch (err) {
      console.warn('[Razorpay] Failed to initialize instance:', err.message);
    }
  }
  return razorpayInstance;
};

export const verifyRazorpaySignature = ({ order_id, payment_id, signature }) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay key secret is not configured');
  }
  const body = `${order_id}|${payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === signature;
};
