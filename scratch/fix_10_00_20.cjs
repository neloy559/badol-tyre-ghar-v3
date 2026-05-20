const mongoose = require('mongoose');
const { Product, Category } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function fixProduct() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB...');

        // 1. Get correct Category ID for Tubes
        const tubesCat = await Category.findOne({ slug: 'tubes' });
        if (!tubesCat) throw new Error('Tubes category not found!');

        // 2. Define the 4 verified images
        const correctMedia = [
            'https://i.ibb.co/q3d02v7G/1.jpg',
            'https://i.ibb.co/fdY8w0ms/2.jpg',
            'https://i.ibb.co/mC0Yh8dw/3.jpg',
            'https://i.ibb.co/7dD0rQmk/4.jpg'
        ];

        // 3. Update Product BTG-001
        const result = await Product.findOneAndUpdate(
            { sku: 'BTG-001' },
            { 
                category: tubesCat._id,
                media: correctMedia,
                'commonSpecs.pattern': '' // Remove the "Flaps" text from pattern
            },
            { new: true }
        );

        if (result) {
            console.log('✅ FIXED BTG-001 (10.00-20):');
            console.log('Category:', tubesCat.name);
            console.log('Media Count:', result.media.length);
        } else {
            console.log('❌ Product BTG-001 not found!');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fixProduct();
