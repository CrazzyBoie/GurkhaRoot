import express from 'express';
import {
  validateCoupon,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/coupon.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/validate', validateCoupon);
router.get('/', authenticate, requireRole('super_admin'), getCoupons);
router.post('/', authenticate, requireRole('super_admin'), createCoupon);
router.put('/:id', authenticate, requireRole('super_admin'), updateCoupon);
router.delete('/:id', authenticate, requireRole('super_admin'), deleteCoupon);

export default router;
