import express from 'express';
import {
  createPaymentIntent,
  webhook,
  getPaymentStatus,
} from '../controllers/payment.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// optionalAuth so guests can also create a payment intent
router.post('/create-intent', optionalAuth, createPaymentIntent);
router.get('/status/:paymentIntentId', optionalAuth, getPaymentStatus);
// Webhook must use raw body — registered before express.json() in index.js
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

export default router;