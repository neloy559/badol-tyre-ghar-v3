const mongoose = require('mongoose');
const { Product, Category } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function manualSplit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const tubesCat = await Category.findOne({ slug: 'tubes' });
        const flapsCat = await Category.findOne({ slug: 'flaps' });

        // 1. Fix 10.00-20
        // BTG-001 -> Flap (Placeholder)
        await Product.findOneAndUpdate(
            { sku: 'BTG-001' },
            { 
                name: '10.00-20 (Flap)',
                category: flapsCat._id, 
                media: ['https://i.ibb.co/6a992WW/flap-placeholder.jpg'], 
                'commonSpecs.pattern': 'Flap' 
            }
        );
        // BTG-032 -> Tube (Original Images)
        await Product.deleteOne({ sku: 'BTG-032' }); // Clean start
        await Product.create({
            sku: 'BTG-032',
            name: '10.00-20 (Tube)',
            slug: 'btg-032',
            category: tubesCat._id,
            media: [
                'https://i.ibb.co/Lhb9BzQr/1.jpg',
                'https://i.ibb.co/Y4Hptv7F/2.jpg',
                'https://i.ibb.co/SXyPLPb6/3.jpg',
                'https://i.ibb.co/pvpcrT7T/4.jpg'
            ],
            variants: [{ sku: 'BTG-032-STD', designModel: 'Zess', price: 3481, stock: 18, stockLabel: 'limited' }]
        });

        // 2. Fix 7.00-15
        // BTG-002 -> Flap
        await Product.findOneAndUpdate(
            { sku: 'BTG-002' },
            { 
                name: '7.00-15 (Flap)',
                category: flapsCat._id, 
                media: ['https://i.ibb.co/6a992WW/flap-placeholder.jpg'], 
                'commonSpecs.pattern': 'Flap' 
            }
        );
        // BTG-054 -> Tube
        await Product.deleteOne({ sku: 'BTG-054' });
        await Product.create({
            sku: 'BTG-054',
            name: '7.00-15 (Tube)',
            slug: 'btg-054',
            category: tubesCat._id,
            media: [
                'https://i.ibb.co/Z6Xwm5jd/1.jpg',
                'https://i.ibb.co/B22J8RTz/2.jpg',
                'https://i.ibb.co/Swr9vw6x/3.jpg',
                'https://i.ibb.co/v43R0L8J/4.jpg'
            ],
            variants: [{ sku: 'BTG-054-STD', designModel: 'Zess', price: 2850, stock: 23, stockLabel: 'in_stock' }]
        });

        console.log('✅ Manual Split Complete: BTG-001/002 are now Flaps. BTG-032/054 are now Tubes.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

manualSplit();
