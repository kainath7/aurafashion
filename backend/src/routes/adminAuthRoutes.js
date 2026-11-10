import express from 'express';
import {
  loginAdmin,
  getAdminProfile,
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetAdminPassword,
  requestChangePasswordOtp,
  verifyChangePasswordOtp,
  updateAdminPasswordFromSettings
} from '../controllers/adminAuthController.js';
import { protectAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Authentication Endpoints
router.post('/login', authLimiter, loginAdmin);

// Module 1: Admin Forgot Password via Email OTP (Public, Rate-limited)
router.post('/forgot-password/request-otp', authLimiter, requestForgotPasswordOtp);
router.post('/forgot-password/verify-otp', authLimiter, verifyForgotPasswordOtp);
router.post('/forgot-password/reset-password', authLimiter, resetAdminPassword);

// Module 2: Admin Change Password inside Settings (Protected, Admin Only)
router.post('/change-password/request-otp', protectAdmin, authLimiter, requestChangePasswordOtp);
router.post('/change-password/verify-otp', protectAdmin, authLimiter, verifyChangePasswordOtp);
router.post('/change-password/reset-password', protectAdmin, authLimiter, updateAdminPasswordFromSettings);
router.post('/change-password/update-password', protectAdmin, authLimiter, updateAdminPasswordFromSettings);

// Profile
router.get('/me', protectAdmin, getAdminProfile);

export default router;
