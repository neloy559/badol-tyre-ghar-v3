const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/analytics.controller');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/version',          ctrl.getVersion);
router.get('/analytics/summary', protect, restrictTo('admin', 'editor'), ctrl.getAnalyticsSummary);
router.post('/analytics/log',    ctrl.logEvent);

module.exports = router;
