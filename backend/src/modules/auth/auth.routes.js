const express = require('express');
const router  = express.Router();
const ctrl    = require('./auth.controller');
const { protect } = require('../../middleware/auth');

router.post('/register',         ctrl.register);
router.post('/dealer/register',  ctrl.dealerRegister);
router.post('/login',            ctrl.login);
router.post('/logout',   ctrl.logout);
router.post('/refresh',  ctrl.refreshToken);
router.get('/me',        protect, ctrl.getMe);

module.exports = router;
