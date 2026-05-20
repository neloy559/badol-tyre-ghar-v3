const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: 'd:/Badol Tyre Ghar - Products/version-3/backend/.env' });

const Product = require('d:/Badol Tyre Ghar - Products/version-3/backend/src/modules/catalog/models/Product');

async function syncMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const results = JSON.parse(fs.readFileSync('d:/Badol Tyre Ghar - Products/version-3/backend/migration_results.json', 'utf8'));
    console.log(`Loaded ${results.length} migration records.`);

    let updated = 0;
    let failed = 0;

    for (const record of results) {
      if (record.status === 'success' && record.newUrl) {
        const res = await Product.updateOne(
          { sku: record.sku },
          { $set: { media: [record.newUrl] } }
        );
        if (res.modifiedCount > 0) {
          updated++;
        } else {
          // Check if it's already updated or SKU mismatch
          const exists = await Product.findOne({ sku: record.sku });
          if (!exists) {
            console.warn(`SKU Not Found: ${record.sku}`);
            failed++;
          }
        }
      }
    }

    console.log(`\nSync Complete:`);
    console.log(`- Updated: ${updated}`);
    console.log(`- Skipped/Failed: ${failed}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncMigration();
