const express = require('express');
const router  = express.Router();
const ctrl    = require('./branding.controller');
const admin   = require('./branding.admin.controller');
const { protect, restrictTo } = require('../../middleware/auth');

// Public
router.get('/', ctrl.getBranding);

// Admin (Protected)
router.use(protect);
router.use(restrictTo('admin'));

router.get('/admin/banners',    admin.getBanners);
router.post('/admin/banners',   admin.createBanner);
router.put('/admin/banners/:id',admin.updateBanner);
router.delete('/admin/banners/:id', admin.deleteBanner);

router.get('/admin/config',     admin.getConfig);
router.patch('/admin/config',   admin.updateConfig);

module.exports = router;
