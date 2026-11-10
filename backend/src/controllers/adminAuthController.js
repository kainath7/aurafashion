import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { sendAdminOtpEmail } from '../services/emailService.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_COOLDOWN_MS = 60 * 1000;   // 60 seconds
const MAX_OTP_ATTEMPTS = 5;

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
};

const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
};

const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
};

const generateAdminToken = (id) => {
  return jwt.sign({ id, type: 'admin' }, process.env.JWT_SECRET || 'aura_fashion_super_secret_jwt_key_2026_secure', {
    expiresIn: '7d'
  });
};

// @desc    Admin login
// @route   POST /api/admin/auth/login
// @access  Public (Admin portal)
export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Admin email and password are required'
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin || !admin.isActive || !(await admin.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials or account disabled'
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateAdminToken(admin._id);

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in admin profile
// @route   GET /api/admin/auth/me
// @access  Private (Admin)
export const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// MODULE 1: ADMIN FORGOT PASSWORD USING EMAIL OTP
// =============================================================================

// @desc    Step 1: Request OTP for Forgot Password
// @route   POST /api/admin/auth/forgot-password/request-otp
// @access  Public (Rate-limited)
export const requestForgotPasswordOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid administrative email address.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log(`[Admin OTP] Forgot password request received for: ${maskEmail(cleanEmail)}`);

    const admin = await Admin.findOne({ email: cleanEmail, isActive: true }).select(
      '+resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpLastSentAt'
    );

    // Generic safe response message to prevent email enumeration
    const genericSuccessResponse = {
      success: true,
      message: 'If this email belongs to an authorized administrator, a 6-digit verification code has been dispatched.'
    };

    if (!admin) {
      console.warn(`[Admin OTP] Forgot password requested for non-existent/inactive admin: ${maskEmail(cleanEmail)}`);
      // Artificial delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 350));
      return res.status(200).json(genericSuccessResponse);
    }

    // Enforce 60-second cooldown
    if (admin.resetOtpLastSentAt) {
      const msSinceLastSend = Date.now() - new Date(admin.resetOtpLastSentAt).getTime();
      if (msSinceLastSend < OTP_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((OTP_COOLDOWN_MS - msSinceLastSend) / 1000);
        console.warn(`[Admin OTP] Cooldown active for ${maskEmail(admin.email)}. Remaining: ${remainingSeconds}s`);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
        });
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = hashOtp(otpCode);

    // Update admin document with OTP hash & 5-minute expiry
    admin.resetOtpHash = hashedOtp;
    admin.resetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    admin.resetOtpAttempts = 0;
    admin.resetOtpLastSentAt = new Date();
    admin.resetOtpVerified = false;
    admin.resetOtpVerifiedExpires = null;
    await admin.save();

    console.log(`[Admin OTP] Forgot password OTP generated and stored for: ${admin._id} (${maskEmail(admin.email)})`);
    console.log(`[Admin OTP] Dispatching Brevo SMTP email to: ${maskEmail(admin.email)}...`);

    // Await email delivery to verify provider acceptance
    const emailResult = await sendAdminOtpEmail({
      admin,
      otpCode,
      purpose: 'Master Password Recovery',
      expireMinutes: 5
    });

    if (!emailResult.success) {
      console.error(`[Admin OTP] SMTP dispatch FAILED for forgot password to ${maskEmail(admin.email)}: ${emailResult.error}`);
      // Invalidate OTP in DB so no usable, undisclosed OTP remains
      admin.resetOtpHash = null;
      admin.resetOtpExpires = null;
      admin.resetOtpLastSentAt = null;
      await admin.save();

      return res.status(502).json({
        success: false,
        message: `Failed to deliver security OTP via email: ${emailResult.error || 'SMTP delivery rejected by mail server'}. Please try again.`
      });
    }

    console.log(`[Admin OTP] SMTP Accepted! MessageId: ${emailResult.messageId} | Recipient: ${maskEmail(admin.email)}`);
    return res.status(200).json(genericSuccessResponse);
  } catch (error) {
    next(error);
  }
};

// @desc    Step 2: Verify OTP for Forgot Password
// @route   POST /api/admin/auth/forgot-password/verify-otp
// @access  Public (Rate-limited)
export const verifyForgotPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Admin email and 6-digit OTP are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be a valid 6-digit number.'
      });
    }

    const admin = await Admin.findOne({ email: cleanEmail, isActive: true }).select(
      '+resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpVerified'
    );

    if (!admin || !admin.resetOtpHash) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new code.'
      });
    }

    // Check expiry (5 minutes)
    if (!admin.resetOtpExpires || new Date() > new Date(admin.resetOtpExpires)) {
      admin.resetOtpHash = null;
      admin.resetOtpExpires = null;
      admin.resetOtpAttempts = 0;
      await admin.save();
      return res.status(400).json({
        success: false,
        message: 'OTP has expired (valid for 5 minutes). Please request a new code.'
      });
    }

    // Check attempts limit
    if (admin.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      admin.resetOtpHash = null;
      admin.resetOtpExpires = null;
      admin.resetOtpAttempts = 0;
      await admin.save();
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. This OTP has been invalidated for security. Please request a new code.'
      });
    }

    // Verify hash
    const inputHash = hashOtp(cleanOtp);
    if (admin.resetOtpHash !== inputHash) {
      admin.resetOtpAttempts = (admin.resetOtpAttempts || 0) + 1;
      await admin.save();
      const attemptsLeft = MAX_OTP_ATTEMPTS - admin.resetOtpAttempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${attemptsLeft > 0 ? `${attemptsLeft} attempt(s) remaining.` : 'OTP has been invalidated.'}`
      });
    }

    // Success: mark verified with a 10-minute window for password setting
    admin.resetOtpVerified = true;
    admin.resetOtpVerifiedExpires = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'OTP successfully verified. Please set your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Step 3: Set New Password after OTP verification
// @route   POST /api/admin/auth/forgot-password/reset-password
// @access  Public (Rate-limited)
export const resetAdminPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, new password, and confirm password are required.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.'
      });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include uppercase, lowercase, and numeric characters.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const admin = await Admin.findOne({ email: cleanEmail, isActive: true }).select(
      '+password +resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpVerified +resetOtpVerifiedExpires'
    );

    if (!admin || !admin.resetOtpHash) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password recovery session. Please request a new OTP.'
      });
    }

    // Ensure OTP was verified in Step 2 or matches directly
    if (otp) {
      const cleanOtp = otp.toString().trim();
      if (admin.resetOtpHash !== hashOtp(cleanOtp)) {
        return res.status(400).json({
          success: false,
          message: 'Security verification mismatch.'
        });
      }
    } else {
      if (!admin.resetOtpVerified || !admin.resetOtpVerifiedExpires || new Date() > new Date(admin.resetOtpVerifiedExpires)) {
        return res.status(400).json({
          success: false,
          message: 'Recovery session expired. Please verify your OTP again.'
        });
      }
    }

    // Update password (pre-save hook hashes with bcrypt automatically)
    admin.password = newPassword;

    // Invalidate OTP and recovery session completely
    admin.resetOtpHash = null;
    admin.resetOtpExpires = null;
    admin.resetOtpAttempts = 0;
    admin.resetOtpVerified = false;
    admin.resetOtpVerifiedExpires = null;
    admin.lastLogin = null; // force re-login

    await admin.save();
    console.log(`[Admin OTP] Admin master password successfully reset for: ${maskEmail(cleanEmail)}`);

    return res.status(200).json({
      success: true,
      message: 'Master password has been updated successfully. Please log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// MODULE 2: CHANGE ADMIN PASSWORD FROM ADMIN SETTINGS (AUTHENTICATED)
// =============================================================================

// @desc    Step 1: Request OTP for Change Password in Settings
// @route   POST /api/admin/auth/change-password/request-otp
// @access  Private (Admin)
export const requestChangePasswordOtp = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id).select(
      '+resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpLastSentAt'
    );

    if (!admin || !admin.isActive) {
      console.warn('[Admin OTP] Change password request rejected: admin session invalid or account inactive.');
      return res.status(401).json({
        success: false,
        message: 'Administrative session invalid or account inactive.'
      });
    }

    // Resolve recipient email:
    // If request provided an email (e.g. shoppe.aurafashion@gmail.com), sync it to the admin record
    if (req.body.email && typeof req.body.email === 'string') {
      const inputEmail = req.body.email.trim().toLowerCase();
      if (inputEmail.includes('@') && admin.email.toLowerCase() !== inputEmail) {
        console.log(`[Admin OTP] Updating admin ${admin._id} email from ${maskEmail(admin.email)} to ${maskEmail(inputEmail)}`);
        admin.email = inputEmail;
        await admin.save();
      }
    }

    const recipientEmail = admin.email;
    console.log(`[Admin OTP] Change password OTP request received for admin: ${admin._id} (${maskEmail(recipientEmail)})`);

    // 60-second cooldown
    if (admin.resetOtpLastSentAt) {
      const msSinceLastSend = Date.now() - new Date(admin.resetOtpLastSentAt).getTime();
      if (msSinceLastSend < OTP_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((OTP_COOLDOWN_MS - msSinceLastSend) / 1000);
        console.warn(`[Admin OTP] Cooldown active for ${maskEmail(recipientEmail)}. Remaining: ${remainingSeconds}s`);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
        });
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = hashOtp(otpCode);

    admin.resetOtpHash = hashedOtp;
    admin.resetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    admin.resetOtpAttempts = 0;
    admin.resetOtpLastSentAt = new Date();
    admin.resetOtpVerified = false;
    admin.resetOtpVerifiedExpires = null;
    await admin.save();

    console.log(`[Admin OTP] Cryptographic OTP generated and hash stored in DB for admin: ${admin._id} (${maskEmail(recipientEmail)})`);
    console.log(`[Admin OTP] Attempting Brevo SMTP dispatch to: ${maskEmail(recipientEmail)}...`);

    // Await email delivery to confirm provider acceptance
    const emailResult = await sendAdminOtpEmail({
      admin,
      otpCode,
      purpose: 'Settings Security Change Password',
      expireMinutes: 5
    });

    if (!emailResult.success) {
      console.error(`[Admin OTP] SMTP dispatch FAILED for ${maskEmail(recipientEmail)}: ${emailResult.error}`);
      // Invalidate OTP in DB so no usable, undisclosed OTP remains
      admin.resetOtpHash = null;
      admin.resetOtpExpires = null;
      admin.resetOtpLastSentAt = null;
      await admin.save();

      return res.status(502).json({
        success: false,
        message: `Failed to deliver OTP to ${recipientEmail}: ${emailResult.error || 'SMTP delivery rejected by mail server'}. Please check your SMTP configuration and try again.`
      });
    }

    console.log(`[Admin OTP] SMTP Accepted! MessageId: ${emailResult.messageId} | Recipient: ${maskEmail(recipientEmail)}`);

    return res.status(200).json({
      success: true,
      message: `A 6-digit security OTP has been accepted by mail server and sent to your registered email (${recipientEmail}).`,
      recipient: recipientEmail
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Step 2: Verify OTP for Change Password in Settings
// @route   POST /api/admin/auth/change-password/verify-otp
// @access  Private (Admin)
export const verifyChangePasswordOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: '6-digit OTP is required.'
      });
    }

    const cleanOtp = otp.toString().trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be a valid 6-digit number.'
      });
    }

    const admin = await Admin.findById(req.admin._id).select(
      '+resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpVerified'
    );

    if (!admin || !admin.resetOtpHash) {
      console.warn(`[Admin OTP] Verification failed: No active OTP record for admin ${req.admin?._id}`);
      return res.status(400).json({
        success: false,
        message: 'No active OTP request found. Please request a new OTP.'
      });
    }

    if (!admin.resetOtpExpires || new Date() > new Date(admin.resetOtpExpires)) {
      admin.resetOtpHash = null;
      admin.resetOtpExpires = null;
      admin.resetOtpAttempts = 0;
      await admin.save();
      console.warn(`[Admin OTP] Verification failed: OTP expired for admin ${admin._id}`);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired (5-minute validity). Please request a new OTP.'
      });
    }

    if (admin.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      admin.resetOtpHash = null;
      admin.resetOtpExpires = null;
      admin.resetOtpAttempts = 0;
      await admin.save();
      console.warn(`[Admin OTP] Verification failed: Max attempts exceeded for admin ${admin._id}`);
      return res.status(429).json({
        success: false,
        message: 'Maximum attempts exceeded. This OTP has been invalidated. Please request a new OTP.'
      });
    }

    const inputHash = hashOtp(cleanOtp);
    if (admin.resetOtpHash !== inputHash) {
      admin.resetOtpAttempts = (admin.resetOtpAttempts || 0) + 1;
      const attemptsLeft = MAX_OTP_ATTEMPTS - admin.resetOtpAttempts;
      if (admin.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
        admin.resetOtpHash = null;
        admin.resetOtpExpires = null;
        admin.resetOtpAttempts = 0;
        await admin.save();
        console.warn(`[Admin OTP] Incorrect OTP. Limit reached for admin ${admin._id}`);
        return res.status(429).json({
          success: false,
          message: 'Too many incorrect attempts. This OTP has been invalidated. Please request a new code.'
        });
      }
      await admin.save();
      console.warn(`[Admin OTP] Incorrect OTP entered for admin ${admin._id}. Attempts left: ${attemptsLeft}`);
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${attemptsLeft} attempt(s) remaining.`
      });
    }

    console.log(`[Admin OTP] Change password OTP successfully verified for admin ${admin._id} (${maskEmail(admin.email)})`);
    admin.resetOtpVerified = true;
    admin.resetOtpVerifiedExpires = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now enter your new master password.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Step 3: Update Password in Settings
// @route   POST /api/admin/auth/change-password/reset-password
// @access  Private (Admin)
export const updateAdminPasswordFromSettings = async (req, res, next) => {
  try {
    const { otp, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password are required.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.'
      });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include uppercase, lowercase, and numeric characters.'
      });
    }

    const admin = await Admin.findById(req.admin._id).select(
      '+password +resetOtpHash +resetOtpExpires +resetOtpAttempts +resetOtpVerified +resetOtpVerifiedExpires'
    );

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Administrative session invalid.'
      });
    }

    // Verify OTP session: either verified in Step 2 or verified directly with OTP code
    if (otp) {
      const cleanOtp = otp.toString().trim();
      if (!admin.resetOtpHash || admin.resetOtpHash !== hashOtp(cleanOtp)) {
        return res.status(400).json({
          success: false,
          message: 'Security verification code mismatch.'
        });
      }
    } else {
      if (!admin.resetOtpVerified || !admin.resetOtpVerifiedExpires || new Date() > new Date(admin.resetOtpVerifiedExpires)) {
        return res.status(400).json({
          success: false,
          message: 'Verification session expired. Please verify your OTP again.'
        });
      }
    }

    // Update password
    admin.password = newPassword;

    // Invalidate OTP fields completely
    admin.resetOtpHash = null;
    admin.resetOtpExpires = null;
    admin.resetOtpAttempts = 0;
    admin.resetOtpVerified = false;
    admin.resetOtpVerifiedExpires = null;
    admin.lastLogin = null; // force re-login

    await admin.save();
    console.log(`[Admin OTP] Admin master password successfully updated for admin ${admin._id} (${maskEmail(admin.email)})`);

    return res.status(200).json({
      success: true,
      message: 'Admin master password successfully updated. Please log in again with your new credentials.'
    });
  } catch (error) {
    next(error);
  }
};
