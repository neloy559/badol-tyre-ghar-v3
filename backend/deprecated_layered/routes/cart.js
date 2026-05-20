const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth');

router.use(protect); // All cart routes require login

router.get('/',        ctrl.getCart);
router.post('/add',    ctrl.addToCart);
router.delete('/remove', ctrl.removeFromCart);
router.post('/submit', ctrl.submitInquiry);

module.exports = router;
