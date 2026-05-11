import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAllUsers,
  updateUserById,
  deleteUserById,
  adminSetUserPassword,
  adminCreateUser,
} from '../controllers/user.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);
router.post('/me/change-password', authenticate, changePassword);

router.get('/me/addresses', authenticate, getAddresses);
router.post('/me/addresses', authenticate, addAddress);
router.put('/me/addresses/:id', authenticate, updateAddress);
router.delete('/me/addresses/:id', authenticate, deleteAddress);

router.get('/me/wishlist', authenticate, getWishlist);
router.post('/me/wishlist/:productId', authenticate, addToWishlist);
router.delete('/me/wishlist/:productId', authenticate, removeFromWishlist);

// Admin-only user management
router.get('/', authenticate, requireRole('super_admin'), getAllUsers);
router.post('/admin/create', authenticate, requireRole('super_admin'), adminCreateUser);
router.put('/:id', authenticate, requireRole('super_admin'), updateUserById);
router.delete('/:id', authenticate, requireRole('super_admin'), deleteUserById);
router.post('/:id/set-password', authenticate, requireRole('super_admin'), adminSetUserPassword);

export default router;