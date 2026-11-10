import express from 'express';
import {
  createOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  trackOrder,
  cancelMyOrder,
  adminGetAllOrders,
  adminUpdateOrderStatus,
  generateOrderInvoice
} from '../controllers/orderController.js';
import { protectCustomer, protectAdmin, optionalCustomer } from '../middleware/auth.js';

const router = express.Router();

// Order tracking without customer login (Public)
router.post('/track', trackOrder);

// Customer / Guest order routes
router.post('/', optionalCustomer, createOrder);
router.post('/:id/verify-payment', optionalCustomer, verifyPayment);
router.get('/my-orders', protectCustomer, getMyOrders);
router.put('/:id/cancel', protectCustomer, cancelMyOrder);

// Order details and invoice (Accessible to guest order placer, customer, or admin)
router.get('/:id', optionalCustomer, getOrderById);
router.get('/:id/invoice', optionalCustomer, generateOrderInvoice);

// Admin order routes (Protected)
router.get('/admin/all', protectAdmin, adminGetAllOrders);
router.put('/admin/:id/status', protectAdmin, adminUpdateOrderStatus);

export default router;
