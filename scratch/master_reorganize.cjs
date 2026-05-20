const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function reorganize() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const products = await Product.find({}).populate('category');
        const root = path.join(__dirname, '../assets_master/products');

        const categories = fs.readdirSync(root);
        for (const cat of categories) {
            const catPath = path.join(root, cat);
            if (!fs.statSync(catPath).isDirectory()) continue;

            const prods = fs.readdirSync(catPath);
            for (const prodFolder of prods) {
                const prodPath = path.join(catPath, prodFolder);
                if (!fs.statSync(prodPath).isDirectory()) continue;

                // 1. Find Match in DB
                let match = products.find(p => p.name.trim().toLowerCase() === prodFolder.trim().toLowerCase());
                
                // If no exact match, try fuzzy (contains)
                if (!match) {
                    match = products.find(p => p.name.toLowerCase().includes(prodFolder.toLowerCase()) || prodFolder.toLowerCase().includes(p.name.toLowerCase()));
                }

                if (match) {
                    const safeName = match.name.replace(/[\/\\?%*:|"<>]/g, '-').trim();
                    const newProdPath = path.join(catPath, safeName);

                    // 2. Rename Folder to exact DB Name
                    if (prodPath !== newProdPath) {
                        if (fs.existsSync(newProdPath)) {
                            // Merge if exists
                            console.log(`Merging ${prodFolder} into existing ${safeName}`);
                        } else {
                            fs.renameSync(prodPath, newProdPath);
                        }
                    }

                    const activePath = fs.existsSync(newProdPath) ? newProdPath : prodPath;

                    // 3. Rename Images: 1.jpeg -> [Name]_1.jpeg
                    const files = fs.readdirSync(activePath);
                    let imgIndex = 1;
                    files.forEach(file => {
                        const ext = path.extname(file).toLowerCase();
                        if (['.jpeg', '.jpg', '.png', '.webp', '.gif', '.mp4'].includes(ext)) {
                            const newFileName = `${safeName.replace(/\s+/g, '_')}_${imgIndex}${ext}`;
                            const oldFilePath = path.join(activePath, file);
                            const newFilePath = path.join(activePath, newFileName);
                            
                            // Don't rename if already formatted
                            if (file !== newFileName && !file.includes(safeName.replace(/\s+/g, '_'))) {
                                fs.renameSync(oldFilePath, newFilePath);
                                imgIndex++;
                            } else if (file.includes(safeName.replace(/\s+/g, '_'))) {
                                imgIndex++;
                            }
                        }
                    });

                    // 4. Generate details.txt
                    const details = [
                        `PRODUCT DETAILS`,
                        `================`,
                        `Name:     ${match.name}`,
                        `SKU:      ${match.sku}`,
                        `Category: ${match.category?.name || cat}`,
                        `Size:     ${match.commonSpecs?.size || 'N/A'}`,
                        `Segment:  ${match.segment || 'N/A'}`,
                        `\nIMGBB URLS:`,
                        ...(match.media || []).map((url, i) => `[${i+1}] ${url}`),
                        `\nLast Synced: ${new Date().toLocaleString()}`
                    ].join('\n');

                    fs.writeFileSync(path.join(activePath, 'details.txt'), details);
                    console.log(`✅ Processed: ${match.sku} - ${match.name}`);

                } else {
                    console.warn(`⚠️ No DB match for folder: ${prodFolder}`);
                }
            }
        }

        console.log('\n🚀 Assets Master Re-Organization Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Re-org failed:', err);
        process.exit(1);
    }
}

reorganize();
