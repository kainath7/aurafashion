import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';

// Verify Customer JWT
export const protectCustomer = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to proceed.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aura_fashion_super_secret_jwt_key_2026_secure');
    if (decoded.type !== 'customer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid customer token session'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Customer account not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.'
    });
  }
};

// Optional Customer Token (For guest cart / checkout pre-checks)
export const optionalCustomer = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aura_fashion_super_secret_jwt_key_2026_secure');
    if (decoded.type === 'customer') {
      const user = await User.findById(decoded.id);
      req.user = user || null;
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  next();
};

// Verify Admin JWT
export const protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Admin authorization required. Access denied.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aura_fashion_super_secret_jwt_key_2026_secure');
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Admin credentials required.'
      });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account inactive or not found.'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin session. Please log in again.'
    });
  }
};
