import express from 'express';
import { getStoreSettings, updateStoreSettings } from '../controllers/storeSettingsController.js';
import { protectAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getStoreSettings);
router.put('/', protectAdmin, upload.single('logo'), updateStoreSettings);

export default router;
