const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function createRegistry() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const products = await Product.find({});
        const root = path.join(__dirname, '../assets_master/products');
        
        let registry = {
            metadata: {
                lastUpdated: new Date().toISOString(),
                totalImages: 0,
                totalProducts: 0
            },
            items: {}
        };

        if (!fs.existsSync(root)) {
            console.error('Assets master root not found');
            process.exit(1);
        }

        const categories = fs.readdirSync(root);
        categories.forEach(cat => {
            const catPath = path.join(root, cat);
            if (!fs.statSync(catPath).isDirectory()) return;

            const prods = fs.readdirSync(catPath);
            prods.forEach(prodFolder => {
                const prodPath = path.join(catPath, prodFolder);
                if (!fs.statSync(prodPath).isDirectory()) return;

                // Match by folder name (which is the product name)
                const match = products.find(p => p.name.trim() === prodFolder.trim());
                const sku = match ? match.sku : `UNKNOWN_${prodFolder.replace(/\s+/g, '_')}`;
                
                const images = fs.readdirSync(prodPath).filter(f => /\.(jpe?g|png|webp|gif|mp4)$/i.test(f));
                
                if (images.length > 0) {
                    registry.items[sku] = {
                        name: prodFolder,
                        sku: match ? match.sku : null,
                        category: cat,
                        localPath: path.relative(path.join(__dirname, '..'), prodPath),
                        files: images
                    };
                    registry.metadata.totalImages += images.length;
                    registry.metadata.totalProducts++;
                }
            });
        });

        const registryPath = path.join(__dirname, '../assets_master/verified_registry.json');
        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
        
        console.log(`\n✅ Registry created at: ${registryPath}`);
        console.log(`📊 Stats: ${registry.metadata.totalProducts} Products, ${registry.metadata.totalImages} Images verified.`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Registry creation failed:', err);
        process.exit(1);
    }
}

createRegistry();
