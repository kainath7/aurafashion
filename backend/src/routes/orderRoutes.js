import express from 'express';
import jwt from 'jsonwebtoken';
import {
  createOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  adminGetAllOrders,
  adminUpdateOrderStatus,
  generateOrderInvoice
} from '../controllers/orderController.js';
import { protectCustomer, protectAdmin } from '../middleware/auth.js';

const router = express.Router();

const protectOrderAccess = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'aura_fashion_super_secret_jwt_key_2026_secure'
    );
    if (decoded.type === 'admin') {
      return protectAdmin(req, res, next);
    } else {
      return protectCustomer(req, res, next);
    }
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
};

// Customer order routes
router.post('/', protectCustomer, createOrder);
router.post('/:id/verify-payment', protectCustomer, verifyPayment);
router.get('/my-orders', protectCustomer, getMyOrders);
router.put('/:id/cancel', protectCustomer, cancelMyOrder);

// Admin order routes
router.get('/admin/all', protectAdmin, adminGetAllOrders);
router.put('/admin/:id/status', protectAdmin, adminUpdateOrderStatus);

// Order details and invoice (dual access: customer who owns order or admin)
router.get('/:id', protectOrderAccess, getOrderById);
router.get('/:id/invoice', protectOrderAccess, generateOrderInvoice);

export default router;
