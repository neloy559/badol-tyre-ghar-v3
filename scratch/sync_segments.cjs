const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

const sealantUpdates = {
    "Arson": { name: "Arson 500ml", segment: "Budget", packing: 35 },
    "5 Star": { name: "Five Star 500ml", segment: "Budget", packing: 35 },
    "C Michel - 1000ml": { name: "C Michael 1000ml", segment: "Budget", packing: 24 },
    "R Michel - 800ml": { name: "R Michael 800ml", segment: "Budget", packing: 24 },
    "AR Mobile - 1000ml": { name: "AR Michael 1000ml", segment: "Budget", packing: 24 },
    "RV Fast (Pink) - 500 ml": { name: "RV Fast Pink 500ml", segment: "Budget", packing: 35 },
    
    "MRF": { name: "MRF 500ml", segment: "Balanced", packing: 35 },
    "NS Best - 500ml": { name: "NS Best Green 500ml", segment: "Balanced", packing: 35 },
    "Quick Best - 500ml": { name: "Quick Best 500ml", segment: "Balanced", packing: 35 },
    "B+": { name: "B+ 500ml", segment: "Balanced", packing: 35 },
    "C Michel - 800 ml": { name: "C Michael 800ml", segment: "Balanced", packing: 24 },
    "RMB - 500 ml": { name: "RMB 500ml", segment: "Balanced", packing: 35 },
    "Arson (Sun Blue) - 1000ml": { name: "Arson (Sun Blue) 1000ml", segment: "Balanced", packing: 24 },
    
    "Arson (Pipe Gel) - 1000 ml": { name: "Pipe Gel Orange 1000ml", segment: "Premium", packing: 24 },
    "Omni": { name: "Omni 1000ml", segment: "Premium", packing: 24 },
    "Total - 1000ml": { name: "Total 1000ml", segment: "Premium", packing: 24 },
    "Sun Power - 1100 ml": { name: "Sun Power 1100 ml", segment: "Premium", packing: 24 },
    "Arson Orange 500ml": { name: "Arson Orange 500ml", segment: "Premium", packing: 24 }
};

async function sync() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB Atlas');

        const products = await Product.find({}).populate('category');
        console.log(`Checking ${products.length} products...`);

        let updatedCount = 0;

        for (const p of products) {
            const catName = p.category?.name || '';
            if (catName === 'Tyre Sealants' || catName === 'Sealant') {
                // Find if this product matches any of our mapping (by name or partial name)
                const updateKey = Object.keys(sealantUpdates).find(k => p.name.includes(k) || k.includes(p.name));
                
                if (updateKey) {
                    const update = sealantUpdates[updateKey];
                    p.segment = update.segment;
                    p.packingSize = `${update.packing} pc/cartoon`;
                    await p.save();
                    console.log(`✅ Updated: ${p.sku} | ${p.name} -> ${p.segment}`);
                    updatedCount++;
                } else {
                    p.segment = 'Standard';
                    await p.save();
                    updatedCount++;
                }
            }
        }

        console.log(`\n🎉 Success! Updated ${updatedCount} sealants with segments.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Sync failed:', err);
        process.exit(1);
    }
}

sync();
