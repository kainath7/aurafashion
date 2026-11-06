import express from 'express';
import {
  getActiveBanners,
  adminGetAllBanners,
  createBanner,
  updateBanner,
  deleteBanner
} from '../controllers/bannerController.js';
import { protectAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getActiveBanners);
router.get('/admin', protectAdmin, adminGetAllBanners);
router.post('/', protectAdmin, upload.single('image'), createBanner);
router.put('/:id', protectAdmin, upload.single('image'), updateBanner);
router.delete('/:id', protectAdmin, deleteBanner);

export default router;
