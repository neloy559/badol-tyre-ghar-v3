const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth');

// All admin routes require login + admin or editor role
router.use(protect);
router.use(restrictTo('admin', 'editor'));

// ── Dealer Queue ──────────────────────────────
router.get('/dealers/pending',          ctrl.getPendingDealers);
router.patch('/dealers/:id/verify',     restrictTo('admin'), ctrl.verifyDealer);
router.patch('/dealers/:id/discount',   restrictTo('admin'), ctrl.setDealerDiscount);

// ── Product Management ────────────────────────
router.post('/products',                ctrl.createProduct);
router.patch('/products/:id',           ctrl.updateProduct);
router.delete('/products/:id',          restrictTo('admin'), ctrl.deleteProduct);
router.post('/products/bulk-markup',    restrictTo('admin'), ctrl.bulkMarkup);
router.post('/products/bulk-upload',   restrictTo('admin'), ctrl.bulkUploadProducts);

// ── Campaign Manager ──────────────────────────
router.get('/campaigns',                ctrl.getCampaigns);
router.post('/campaigns',               ctrl.createCampaign);
router.patch('/campaigns/:id',          ctrl.updateCampaign);

// ── Inquiry CRM ───────────────────────────────
router.get('/inquiries',                ctrl.getInquiries);
router.patch('/inquiries/:id/status',   ctrl.updateInquiryStatus);

// ── Data Export ───────────────────────────────
router.get('/export/products',          ctrl.exportProducts);

module.exports = router;
