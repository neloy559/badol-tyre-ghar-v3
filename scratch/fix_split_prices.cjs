const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function fixPrices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Fix 10.00-20 Tube
        await Product.findOneAndUpdate(
            { sku: 'BTG-032' },
            { 
                variants: [{ 
                    sku: 'BTG-032-STD', 
                    designModel: 'Zess', 
                    price: 3481, 
                    stock: 18, 
                    stockLabel: 'limited' 
                }] 
            }
        );

        // Fix 7.00-15 Tube
        await Product.findOneAndUpdate(
            { sku: 'BTG-054' },
            { 
                variants: [{ 
                    sku: 'BTG-054-STD', 
                    designModel: 'Zess', 
                    price: 2850, 
                    stock: 23, 
                    stockLabel: 'in_stock' 
                }] 
            }
        );

        console.log('✅ Manual Price Fix Complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixPrices();
