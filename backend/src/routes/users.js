const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const upgrade = require('../modules/users/upgrade.controller');

router.post('/me/upgrade-request',    protect, upgrade.submitUpgradeRequest);
router.delete('/me/upgrade-request',  protect, upgrade.withdrawUpgradeRequest);
router.get('/me/upgrade-request',     protect, upgrade.getUpgradeStatus);

module.exports = router;
