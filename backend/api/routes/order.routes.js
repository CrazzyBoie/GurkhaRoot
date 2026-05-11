import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateStatus,
} from '../controllers/order.controller.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', optionalAuth, createOrder);
router.get('/my', authenticate, getMyOrders);
router.get('/:id', authenticate, getOrder);
router.get('/', authenticate, requireRole('super_admin'), getAllOrders);
router.patch('/:id/status', authenticate, requireRole('super_admin'), updateStatus);

export default router;
