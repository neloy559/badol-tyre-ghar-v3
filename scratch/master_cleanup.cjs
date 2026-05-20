const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function masterCleanup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB for Master Cleanup...');

        const products = await Product.find({}).populate('category');
        let fixedCount = 0;

        for (let p of products) {
            let changed = false;

            // 1. De-duplicate Variants (based on designModel/Brand name)
            const seen = new Set();
            const uniqueVariants = p.variants.filter(v => {
                const identifier = v.designModel.trim();
                if (seen.has(identifier)) {
                    changed = true;
                    return false;
                }
                seen.add(identifier);
                return true;
            });
            if (changed) p.variants = uniqueVariants;

            // 2. Clear Lazy Specs (Pattern == Category Name)
            if (p.commonSpecs?.pattern && p.category?.name && p.commonSpecs.pattern === p.category.name) {
                p.commonSpecs.pattern = '';
                changed = true;
            }

            // 3. Fix Placeholder Origin
            if (p.commonSpecs?.origin === 'N/A') {
                p.commonSpecs.origin = ''; // Leave empty for cleaner UI
                changed = true;
            }

            // 4. Normalize Nonsensical Names
            if (/^\d+\.\d+$/.test(p.name)) {
                p.name = `Product ${p.sku}`; // Fallback to SKU name
                changed = true;
            }

            if (changed) {
                await p.save();
                fixedCount++;
                console.log(`✅ Fixed: ${p.sku} - ${p.name}`);
            }
        }

        console.log(`\n🎉 Master Cleanup Complete! ${fixedCount} products sanitized.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

masterCleanup();
