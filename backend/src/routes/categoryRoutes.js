import express from 'express';
import {
  getCategories,
  getCategoryByIdOrSlug,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';
import { protectAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getCategories);
router.get('/:idOrSlug', getCategoryByIdOrSlug);

// Admin category management
router.post('/', protectAdmin, upload.single('image'), createCategory);
router.put('/:id', protectAdmin, upload.single('image'), updateCategory);
router.delete('/:id', protectAdmin, deleteCategory);

export default router;
