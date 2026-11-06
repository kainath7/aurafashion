import express from 'express';
import {
  getStoreSettings,
  updateStoreSettings,
  sendTestEmailController,
  getEmailLogsController
} from '../controllers/storeSettingsController.js';
import { protectAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getStoreSettings);
router.put('/', protectAdmin, upload.single('logo'), updateStoreSettings);
router.post('/test-email', protectAdmin, sendTestEmailController);
router.get('/email-logs', protectAdmin, getEmailLogsController);

export default router;
