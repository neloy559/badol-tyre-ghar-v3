const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function checkSegments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const validSegments = ['Premium', 'Balanced', 'Budget', '', null];
        const invalidProducts = await Product.find({ segment: { $nin: validSegments } });
        
        if (invalidProducts.length > 0) {
            console.log('Found Invalid Segments:');
            invalidProducts.forEach(p => console.log(`${p.sku} - ${p.name} - Segment: "${p.segment}"`));
        } else {
            console.log('✅ All segments are normalized.');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSegments();
