const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config({ path: 'd:/Badol Tyre Ghar - Products/version-3/backend/.env' });

const Product = require('d:/Badol Tyre Ghar - Products/version-3/backend/src/modules/catalog/models/Product');

async function syncMigration() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30s timeout
    });
    console.log('✅ Connected to DB');

    const results = JSON.parse(fs.readFileSync('d:/Badol Tyre Ghar - Products/version-3/backend/migration_results.json', 'utf8'));
    console.log(`Loaded ${results.length} migration records.`);

    let updated = 0;
    let total = results.length;

    for (let i = 0; i < total; i++) {
      const record = results[i];
      if (record.status === 'success' && record.newUrl) {
        const res = await Product.updateOne(
          { sku: record.sku },
          { $set: { media: [record.newUrl] } }
        );
        if (res.modifiedCount > 0) updated++;
      }
      
      if ((i + 1) % 20 === 0) console.log(`Progress: ${i + 1}/${total}...`);
    }

    console.log(`\n🎉 Sync Complete!`);
    console.log(`- Total Records Processed: ${total}`);
    console.log(`- Database Products Updated: ${updated}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Sync Failed:', err.message);
    process.exit(1);
  }
}

syncMigration();
