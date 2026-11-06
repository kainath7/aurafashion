import express from 'express';
import {
  getAdminCustomers,
  getAdminCustomerDetails
} from '../controllers/customerManagementController.js';
import { protectAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protectAdmin, getAdminCustomers);
router.get('/:id', protectAdmin, getAdminCustomerDetails);

export default router;
