const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function fixSegments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Premium
        await Product.updateMany(
            { sku: { $in: ['BTG-062', 'BTG-069', 'BTG-074'] } },
            { $set: { segment: 'Premium' } }
        );

        // Budget
        await Product.updateMany(
            { sku: 'BTG-064' },
            { $set: { segment: 'Budget' } }
        );

        // Balanced
        await Product.updateMany(
            { sku: { $in: ['BTG-060', 'BTG-067', 'BTG-068', 'BTG-071', 'BTG-073', 'BTG-075', 'BTG-076', 'BTG-077', 'BTG-078'] } },
            { $set: { segment: 'Balanced' } }
        );

        console.log('✅ Segment Normalization Complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixSegments();
