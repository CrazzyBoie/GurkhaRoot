import express from 'express';
import {
  createPaymentIntent,
  webhook,
  getPaymentStatus,
  refundPayment,
  confirmPayment,
} from '../controllers/payment.controller.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// optionalAuth so guests can also create a payment intent
router.post('/create-intent', optionalAuth, createPaymentIntent);
router.get('/status/:paymentIntentId', optionalAuth, getPaymentStatus);

// ── NEW: Refund route — admin/super_admin only ─────────────────────────────
router.post('/refund', authenticate, requireRole('super_admin', 'inventory_manager'), refundPayment);

// Confirm payment after Stripe succeeds (frontend calls this, no webhook dependency)
router.post('/confirm', optionalAuth, confirmPayment);

// Webhook must use raw body — registered before express.json() in index.js
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

export default router;