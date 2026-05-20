const mongoose = require('mongoose');
const { Product, Category } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function deepAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB for audit...\n');

        const products = await Product.find({}).populate('category').populate('brand');
        let report = [];

        products.forEach(p => {
            let issues = [];

            // 1. Category Consistency
            const nameLower = p.name.toLowerCase();
            const catSlug = p.category?.slug || 'none';
            
            if (nameLower.includes('tube') && catSlug !== 'tubes') {
                issues.push(`Mismatch: Name has "Tube" but category is "${catSlug}"`);
            }
            if (nameLower.includes('flap') && catSlug !== 'flaps') {
                issues.push(`Mismatch: Name has "Flap" but category is "${catSlug}"`);
            }
            if (nameLower.includes('patch') && catSlug !== 'patches') {
                issues.push(`Mismatch: Name has "Patch" but category is "${catSlug}"`);
            }

            // 2. Duplicate Variants
            const vNames = p.variants.map(v => v.designModel);
            const duplicates = vNames.filter((item, index) => vNames.indexOf(item) !== index);
            if (duplicates.length > 0) {
                issues.push(`Duplicate Variants: [${[...new Set(duplicates)].join(', ')}]`);
            }

            // 3. Lazy Specifications
            if (p.commonSpecs?.pattern && p.commonSpecs.pattern === p.category?.name) {
                issues.push(`Lazy Spec: "Pattern" field just mirrors Category name`);
            }
            if (!p.commonSpecs?.origin || p.commonSpecs.origin === 'N/A') {
                issues.push(`Missing Data: Origin is N/A`);
            }

            // 4. Media Audit
            if (!p.media || p.media.length === 0) {
                issues.push(`Critical: No images found`);
            }

            if (issues.length > 0) {
                report.push({
                    sku: p.sku,
                    name: p.name,
                    category: p.category?.name,
                    issues: issues
                });
            }
        });

        console.log(`\n🔎 FOUND ISSUES IN ${report.length} PRODUCTS:\n`);
        console.log(JSON.stringify(report, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

deepAudit();
