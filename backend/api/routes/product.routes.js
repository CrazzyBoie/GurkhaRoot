import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImport,
  getCategories,
} from '../controllers/product.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { upload, handleUploadError, handleFirebaseUpload } from '../middleware/upload.middleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', getProduct);

router.post('/',
  authenticate,
  requireRole('super_admin', 'inventory_manager'),
  upload.array('images', 5),
  handleUploadError,
  handleFirebaseUpload,
  createProduct
);

router.put('/:id',
  authenticate,
  requireRole('super_admin', 'inventory_manager'),
  upload.array('images', 5),
  handleUploadError,
  handleFirebaseUpload,
  updateProduct
);

router.delete('/:id',
  authenticate,
  requireRole('super_admin', 'inventory_manager'),
  deleteProduct
);

router.post('/bulk-import',
  authenticate,
  requireRole('super_admin', 'inventory_manager'),
  bulkImport
);

export default router;