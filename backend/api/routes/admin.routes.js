import express from 'express';
import {
  getStats,
  getSalesChart,
  getLowStock,
  getRecentOrders,
  updateUserRole,
  getStockOverview,
  updateDamagedStock,
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/stats', requireRole('super_admin', 'inventory_manager'), getStats);
router.get('/sales-chart', requireRole('super_admin', 'inventory_manager'), getSalesChart);
router.get('/low-stock', requireRole('super_admin', 'inventory_manager'), getLowStock);
router.get('/recent-orders', requireRole('super_admin', 'inventory_manager'), getRecentOrders);
router.patch('/users/:id/role', requireRole('super_admin'), updateUserRole);
router.get('/stock-overview', requireRole('super_admin', 'inventory_manager'), getStockOverview);
router.patch('/variants/:id/damaged', requireRole('super_admin', 'inventory_manager'), updateDamagedStock);

export default router;