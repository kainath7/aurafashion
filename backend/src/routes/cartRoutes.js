import express from 'express';
import {
  validateGuestCart,
  getCustomerCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  mergeGuestCart
} from '../controllers/cartController.js';
import { protectCustomer } from '../middleware/auth.js';

const router = express.Router();

// Guest shopping route: validate cart in local storage
router.post('/guest/validate', validateGuestCart);

// Customer authenticated routes
router.get('/', protectCustomer, getCustomerCart);
router.post('/items', protectCustomer, addToCart);
router.put('/items/:itemId', protectCustomer, updateCartItem);
router.delete('/items/:itemId', protectCustomer, removeFromCart);
router.post('/merge', protectCustomer, mergeGuestCart);

export default router;
