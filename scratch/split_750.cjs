const mongoose = require('mongoose');
const { Product, Category } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function split750() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const tubesCat = await Category.findOne({ slug: 'tubes' });
        const flapsCat = await Category.findOne({ slug: 'flaps' });

        // Fix BTG-003 (Flap)
        await Product.findOneAndUpdate(
            { sku: 'BTG-003' },
            { 
                name: '7.50-16 (Flap)',
                category: flapsCat._id, 
                media: ['https://i.ibb.co/6a992WW/flap-placeholder.jpg'], 
                'commonSpecs.pattern': 'Flap' 
            }
        );

        // Restore BTG-055 (Tube)
        await Product.deleteOne({ sku: 'BTG-055' });
        await Product.create({
            sku: 'BTG-055',
            name: '7.50-16 (Tube)',
            slug: 'btg-055',
            category: tubesCat._id,
            media: [
                'https://i.ibb.co/wZ0NxP8f/1.jpg',
                'https://i.ibb.co/qYsdpb8r/2.jpg',
                'https://i.ibb.co/BSMc1VR/3.jpg',
                'https://i.ibb.co/Kcg5b8f0/3.png',
                'https://i.ibb.co/CswHwfmH/4.jpg',
                'https://i.ibb.co/RGVFm7hM/5.jpg'
            ],
            variants: [{ 
                sku: 'BTG-055-STD', 
                designModel: 'Zess', 
                price: 3150, 
                stock: 12, 
                stockLabel: 'limited' 
            }]
        });

        console.log('✅ 7.50-16 Split Complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

split750();
