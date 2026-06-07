const express = require('express');
const router  = express.Router();

// Import Module Routes
const authRoutes    = require('../modules/auth/auth.routes');
const catalogRoutes = require('../modules/catalog/catalog.routes');
const inquiryRoutes = require('../modules/inquiry/inquiry.routes');
const adminRoutes   = require('../routes/admin');
const userRoutes    = require('../routes/users');

const brandingRoutes = require('../modules/ops/branding.routes');

// Mount Routes
router.use('/auth',     authRoutes);
router.use('/products', catalogRoutes);
router.use('/catalog',  catalogRoutes);
router.use('/cart',     inquiryRoutes);
router.use('/admin',    adminRoutes);
router.use('/users',    userRoutes);
router.use('/branding', brandingRoutes);

// Health Check
router.get('/health', async (req, res) => {
  try {
    const connectDB = require('../config/db');
    await connectDB();
    res.status(200).json({
      success: true,
      message: 'BTG V3 API is healthy',
      timestamp: new Date().toISOString(),
      db: 'connected'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'API Unhealthy - DB Connection Failed',
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? 'Redacted' : err.stack
    });
  }
});

module.exports = router;
