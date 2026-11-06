import express from 'express';
import { loginAdmin, getAdminProfile } from '../controllers/adminAuthController.js';
import { protectAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, loginAdmin);
router.get('/me', protectAdmin, getAdminProfile);

export default router;
