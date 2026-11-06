import express from 'express';
import {
  getProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { protectAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/:idOrSlug', getProductByIdOrSlug);

// Admin product management (supports multiple image upload)
router.post('/', protectAdmin, upload.array('images', 8), createProduct);
router.put('/:id', protectAdmin, upload.array('images', 8), updateProduct);
router.delete('/:id', protectAdmin, deleteProduct);

export default router;
