const express = require('express');
const router  = express.Router();
const ctrl    = require('./catalog.controller');

router.get('/',           ctrl.getProducts);
router.get('/categories', ctrl.getCategories);
router.get('/brands',     ctrl.getBrands);
router.get('/search/suggestions', ctrl.getSuggestions);
router.get('/:slug',      ctrl.getProduct);

module.exports = router;
