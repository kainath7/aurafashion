import express from 'express';
import { reverseGeocodeController } from '../controllers/geocodeController.js';

const router = express.Router();

// @desc    Reverse geocode coordinates into a structured readable address
// @route   GET /api/geocode/reverse?lat=...&lng=...
// @access  Public
router.get('/reverse', reverseGeocodeController);

export default router;
