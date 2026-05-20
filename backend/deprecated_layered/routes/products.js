const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/product.controller');
const { protect } = require('../middleware/auth');

// Public — role detected from optional token if present
router.get('/',      ctrl.getProducts);
router.get('/:slug', ctrl.getProduct);

module.exports = router;
