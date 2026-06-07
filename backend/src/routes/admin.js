const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth');

// Domain Controllers
const userAdmin        = require('../modules/users/user.admin.controller');
const inquiryAdmin     = require('../modules/inquiry/inquiry.admin.controller');
const marketingAdmin   = require('../modules/marketing/marketing.admin.controller');
const searchIntelAdmin = require('../modules/catalog/searchIntelligence.admin.controller');
const pdfAdmin         = require('../modules/catalog/pdf.admin.controller');
const analyticsAdmin   = require('../modules/ops/analytics.admin.controller');

// Sub-routers
const catalogAdminRoutes = require('./admin.catalog');

// Protect all admin routes
router.use(protect);
router.use(restrictTo('admin', 'editor'));

// 1. Analytics Dashboard
router.get('/analytics/summary', analyticsAdmin.getSummary);

// 2. Catalog Admin (CRUD, Bulk, Upload)
router.use('/catalog', catalogAdminRoutes);

// 2. Dealer Verification & Registration
router.get('/dealers/pending',              userAdmin.getPendingDealers);
router.get('/dealers/registrations',        userAdmin.getRegistrations);
router.patch('/dealers/:id/verify',         userAdmin.verifyDealer);
router.patch('/dealers/:id/discount',       userAdmin.setDealerDiscount);
router.patch('/dealers/:id/approve',        userAdmin.approveDealer);
router.patch('/dealers/:id/reject',         userAdmin.rejectDealer);
router.patch('/dealers/:id/tier',           userAdmin.setDealerTier);

// 3. Inquiry CRM
router.get('/inquiries',              inquiryAdmin.getInquiries);
router.patch('/inquiries/:id/status', inquiryAdmin.updateInquiryStatus);

// 4. Campaign Manager
router.post('/campaigns',      marketingAdmin.createCampaign);
router.get('/campaigns',       marketingAdmin.getCampaigns);
router.patch('/campaigns/:id', marketingAdmin.updateCampaign);

// 5. Search Intelligence
router.get('/search-intelligence',               searchIntelAdmin.getSearchLogs);
router.post('/search-intelligence/:id/assign',   searchIntelAdmin.assignTag);
router.delete('/search-intelligence/bulk-clear', searchIntelAdmin.clearAssigned);
router.delete('/search-intelligence/:id',        searchIntelAdmin.deleteSearchLog);

// 6. PDF Management
router.get('/pdf/manifest',          pdfAdmin.getManifest);
router.get('/pdf/analytics',         pdfAdmin.getAnalytics);
router.post('/pdf/mark-ready',       pdfAdmin.markReady);
router.post('/pdf/mark-generating',  pdfAdmin.markGenerating);
router.post('/pdf/mark-failed',      pdfAdmin.markFailed);

// 7. Customer-to-Dealer Upgrade Requests
const upgrade = require('../modules/users/upgrade.controller');
router.get('/upgrade-requests',               upgrade.listUpgradeRequests);
router.patch('/upgrade-requests/:id/approve', upgrade.approveUpgradeRequest);
router.patch('/upgrade-requests/:id/reject',  upgrade.rejectUpgradeRequest);

module.exports = router;
