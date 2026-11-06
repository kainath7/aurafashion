import express from 'express';
import {
  validateCoupon,
  adminGetAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} from '../controllers/couponController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/validate', validateCoupon);
router.get('/admin', protectAdmin, adminGetAllCoupons);
router.post('/', protectAdmin, createCoupon);
router.put('/:id', protectAdmin, updateCoupon);
router.delete('/:id', protectAdmin, deleteCoupon);

export default router;
