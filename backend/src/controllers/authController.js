import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';

const generateToken = (id) => {
  return jwt.sign({ id, type: 'customer' }, process.env.JWT_SECRET || 'aura_fashion_super_secret_jwt_key_2026_secure', {
    expiresIn: '30d'
  });
};

// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
export const registerCustomer = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || ''
    });

    const token = generateToken(user._id);

    // Send welcome email asynchronously without blocking registration
    sendWelcomeEmail(user).catch((err) => {
      console.warn('[Welcome Email Warning]:', err.message);
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login customer
// @route   POST /api/auth/login
// @access  Public
export const loginCustomer = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current customer profile
// @route   GET /api/auth/me
// @access  Private (Customer)
export const getCustomerProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer profile
// @route   PUT /api/auth/profile
// @access  Private (Customer)
export const updateCustomerProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add delivery address
// @route   POST /api/auth/addresses
// @access  Private (Customer)
export const addAddress = async (req, res, next) => {
  try {
    const {
      fullName,
      phone,
      houseNo,
      street,
      area,
      landmark,
      city,
      state,
      pincode,
      isDefault,
      latitude,
      longitude,
      formattedAddress,
      addressSource
    } = req.body;
    const user = await User.findById(req.user._id);

    if (isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push({
      fullName,
      phone,
      houseNo,
      street,
      area: area || '',
      landmark: landmark || '',
      city,
      state,
      pincode,
      isDefault: Boolean(isDefault || user.addresses.length === 0),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      formattedAddress: formattedAddress || '',
      addressSource: addressSource || 'MANUAL'
    });

    await user.save();

    res.status(201).json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete delivery address
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private (Customer)
export const deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter((addr) => addr._id.toString() !== req.params.addressId);
    await user.save();

    res.json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle wishlist item
// @route   POST /api/auth/wishlist/:productId
// @access  Private (Customer)
export const toggleWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;

    const existsIndex = user.wishlist.findIndex((id) => id.toString() === productId);
    let isInWishlist = false;

    if (existsIndex > -1) {
      user.wishlist.splice(existsIndex, 1);
    } else {
      user.wishlist.push(productId);
      isInWishlist = true;
    }

    await user.save();

    res.json({
      success: true,
      isInWishlist,
      wishlist: user.wishlist
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer wishlist
// @route   GET /api/auth/wishlist
// @access  Private (Customer)
export const getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: { path: 'category' }
    });

    res.json({
      success: true,
      wishlist: user.wishlist || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request password reset link
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid registered email address'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // Security practice: Always return generic success message to prevent user enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent to your inbox.'
      });
    }

    // Generate 32-byte cryptographically secure random token
    const rawResetToken = crypto.randomBytes(32).toString('hex');

    // Hash token with SHA-256 before storing in database
    const hashedToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    // Set token and 20-minute expiration period
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 20 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    // Send email with the raw token in link
    await sendPasswordResetEmail(user, rawResetToken);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent to your inbox.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using valid reset token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match'
      });
    }

    // Hash the token provided in URL params to match with DB stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new one.'
      });
    }

    // Set new password (pre-save hook hashes with bcrypt)
    user.password = password;

    // Invalidate reset token after single successful use
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new session token so customer can log in immediately
    const authToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password has been reset successfully! You are now logged in.',
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};
