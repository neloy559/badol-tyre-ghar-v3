const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImage } = require('../controllers/upload.controller');
const { protect, restrictTo } = require('../middleware/auth');

// Setup multer to store file in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/v1/upload
router.post('/', protect, restrictTo('admin', 'editor'), upload.single('image'), uploadImage);

module.exports = router;
