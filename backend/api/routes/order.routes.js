import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateStatus,
  trackOrder,
} from '../controllers/order.controller.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// ── PUBLIC — no auth required ─────────────────────────────────────────────────
router.get('/track', trackOrder);

// ── Customer routes ───────────────────────────────────────────────────────────
router.post('/', optionalAuth, createOrder);
router.get('/my', authenticate, getMyOrders);
router.get('/:id', authenticate, getOrder);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/', authenticate, requireRole('super_admin'), getAllOrders);
router.patch('/:id/status', authenticate, requireRole('super_admin'), updateStatus);

export default router;