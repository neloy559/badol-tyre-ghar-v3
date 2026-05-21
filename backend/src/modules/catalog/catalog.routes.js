const express = require('express');
const router  = express.Router();
const ctrl    = require('./catalog.controller');
const pdfCtrl = require('./pdf.controller');

router.get('/',           ctrl.getProducts);
router.get('/categories', ctrl.getCategories);
router.get('/brands',     ctrl.getBrands);
router.get('/search/suggestions', ctrl.getSuggestions);

// PDF manifest & download logging (public, but logDownload uses optionalAuth)
router.get('/pdf-manifest',      pdfCtrl.getPdfManifest);
router.post('/pdf-download-log', pdfCtrl.logDownload);

router.get('/:slug',      ctrl.getProduct);

module.exports = router;
