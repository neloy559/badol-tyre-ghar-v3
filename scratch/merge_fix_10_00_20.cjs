const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function mergeFix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const correctMedia = [
            'https://i.ibb.co/Lhb9BzQr/1.jpg',
            'https://i.ibb.co/Y4Hptv7F/2.jpg',
            'https://i.ibb.co/SXyPLPb6/3.jpg',
            'https://i.ibb.co/pvpcrT7T/4.jpg'
        ];

        // Fix the main one
        await Product.findOneAndUpdate(
            { sku: 'BTG-001' },
            { media: correctMedia }
        );

        // Delete the duplicate
        await Product.findOneAndDelete({ sku: 'BTG-032' });

        console.log('✅ FIXED: BTG-001 now has TUBE images. Duplicate BTG-032 DELETED.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

mergeFix();
