require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { seedTierPricing } = require('./src/scripts/seedTierPricing');

// Connect Database then seed
const dbPromise = connectDB().then(() => seedTierPricing());

// Start Server (Local) or Export (Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n🔥 BTG V3 Modular API running in [${process.env.NODE_ENV}] mode`);
    console.log(`🌐 Listening on http://localhost:${PORT}/api/v1/health\n`);
  });
}

// Export for Vercel
module.exports = app;
