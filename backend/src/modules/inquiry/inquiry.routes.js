const express = require('express');
const router  = express.Router();
const ctrl    = require('./inquiry.controller');
const { protect } = require('../../middleware/auth');
const optionalAuth = require('../../middleware/optionalAuth');

router.post('/',    optionalAuth, ctrl.createInquiry);
router.get('/me',   protect,      ctrl.getMyInquiries);

module.exports = router;
