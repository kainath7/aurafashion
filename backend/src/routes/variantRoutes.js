import express from 'express';
import {
  getInventoryList,
  adjustVariantStock,
  addVariant,
  deleteVariant
} from '../controllers/variantController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/inventory', protectAdmin, getInventoryList);
router.put('/:id/stock', protectAdmin, adjustVariantStock);
router.post('/', protectAdmin, addVariant);
router.delete('/:id', protectAdmin, deleteVariant);

export default router;
