const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth');

// Domain Controllers
const userAdmin      = require('../modules/users/user.admin.controller');
const inquiryAdmin   = require('../modules/inquiry/inquiry.admin.controller');
const marketingAdmin = require('../modules/marketing/marketing.admin.controller');
const searchIntelAdmin = require('../modules/catalog/searchIntelligence.admin.controller');

// Sub-routers
const catalogAdminRoutes = require('./admin.catalog');

// Protect all admin routes
router.use(protect);
router.use(restrictTo('admin', 'editor'));

// 1. Catalog Admin (CRUD, Bulk, Upload)
router.use('/catalog', catalogAdminRoutes);

// 2. Dealer Verification
router.get('/dealers/pending',        userAdmin.getPendingDealers);
router.patch('/dealers/:id/verify',   userAdmin.verifyDealer);
router.patch('/dealers/:id/discount', userAdmin.setDealerDiscount);

// 3. Inquiry CRM
router.get('/inquiries',              inquiryAdmin.getInquiries);
router.patch('/inquiries/:id/status', inquiryAdmin.updateInquiryStatus);

// 4. Campaign Manager
router.post('/campaigns',      marketingAdmin.createCampaign);
router.get('/campaigns',       marketingAdmin.getCampaigns);
router.patch('/campaigns/:id', marketingAdmin.updateCampaign);

// 5. Search Intelligence
router.get('/search-intelligence',                    searchIntelAdmin.getSearchLogs);
router.post('/search-intelligence/:id/assign',        searchIntelAdmin.assignTag);
router.delete('/search-intelligence/bulk-clear',      searchIntelAdmin.clearAssigned);
router.delete('/search-intelligence/:id',             searchIntelAdmin.deleteSearchLog);

module.exports = router;
