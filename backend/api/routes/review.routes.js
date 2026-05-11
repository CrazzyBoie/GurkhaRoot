import express from 'express';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/:productId', getProductReviews);
router.post('/:productId', authenticate, createReview);
router.put('/:id', authenticate, updateReview);
router.delete('/:id', authenticate, deleteReview);

export default router;
