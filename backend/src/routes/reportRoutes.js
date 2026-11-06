import express from 'express';
import {
  getDashboardStats,
  exportOrdersExcel,
  exportInventoryExcel
} from '../controllers/reportController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard-stats', protectAdmin, getDashboardStats);
router.get('/export/orders', protectAdmin, exportOrdersExcel);
router.get('/export/inventory', protectAdmin, exportInventoryExcel);

export default router;
