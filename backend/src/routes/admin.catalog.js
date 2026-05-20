const express = require('express');
const router  = express.Router();
const ctrl    = require('../modules/catalog/catalog.admin.controller');
const brandCtrl = require('../modules/catalog/brand.admin.controller');
const uploadCtrl = require('../modules/catalog/upload.controller');
const multer  = require('multer');
const upload  = multer({ storage: multer.memoryStorage() });

// ⚠️ Specific routes MUST come before parameterized /:id routes
router.post('/products/bulk-upload', ctrl.bulkUploadProducts);
router.post('/products/bulk-markup', ctrl.bulkMarkup);

router.get('/products',              ctrl.getAdminProducts);   // Raw list for Admin UI
router.post('/products',             ctrl.createProduct);
router.patch('/products/bulk-toggle',ctrl.bulkToggleProductField); // Bulk toggle (must be before /:id)
router.patch('/products/:id/toggle', ctrl.toggleProductField);  // Quick toggle for isVisible/showPrice
router.patch('/products/:id',        ctrl.updateProduct);
router.delete('/products/:id',       ctrl.deleteProduct);

router.get('/export/products',       ctrl.exportProducts);
router.post('/sync-migration',       ctrl.syncMigrationResults);

// Image Upload
router.post('/upload', upload.array('images'), uploadCtrl.uploadImage);

// ── Brand Management ──────────────────────────────────────────
router.get('/brands',                brandCtrl.getAllBrands);
router.post('/brands',               brandCtrl.createBrand);
router.patch('/brands/:id/toggle',   brandCtrl.toggleBrand);
router.patch('/brands/:id',          brandCtrl.updateBrand);
router.delete('/brands/:id',         brandCtrl.deleteBrand);

module.exports = router;
