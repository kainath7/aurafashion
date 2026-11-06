import express from 'express';
import {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  addAddress,
  deleteAddress,
  toggleWishlist,
  getWishlist
} from '../controllers/authController.js';
import { protectCustomer } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, registerCustomer);
router.post('/login', authLimiter, loginCustomer);
router.get('/me', protectCustomer, getCustomerProfile);
router.put('/profile', protectCustomer, updateCustomerProfile);

router.post('/addresses', protectCustomer, addAddress);
router.delete('/addresses/:addressId', protectCustomer, deleteAddress);

router.get('/wishlist', protectCustomer, getWishlist);
router.post('/wishlist/:productId', protectCustomer, toggleWishlist);

export default router;
