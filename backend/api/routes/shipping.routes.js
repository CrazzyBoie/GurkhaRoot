import express from 'express';
import {
  getShippingCost,
  getShippingMethods,
  getCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  getAdminMethods,
  updateMethod,
} from '../controllers/shipping.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── Public routes (used by checkout) ──────────────────────────────────────────
// GET /api/shipping/cost?country=New Zealand&method=express
router.get('/cost', getShippingCost);
// GET /api/shipping/methods?country=New Zealand
router.get('/methods', getShippingMethods);

// ── Admin routes ───────────────────────────────────────────────────────────────
router.use('/admin', authenticate, requireRole('super_admin', 'inventory_manager'));

router.get('/admin/countries', getCountries);
router.post('/admin/countries', requireRole('super_admin'), createCountry);
router.patch('/admin/countries/:id', requireRole('super_admin'), updateCountry);
router.delete('/admin/countries/:id', requireRole('super_admin'), deleteCountry);

router.get('/admin/methods', getAdminMethods);
router.patch('/admin/methods/:id', requireRole('super_admin'), updateMethod);

export default router;