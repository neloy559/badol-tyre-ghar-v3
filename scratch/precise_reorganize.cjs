const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

async function reorganize() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
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

                const normalizedFolder = normalize(prodFolder);
                
                // 1. Try Exact Match
                let match = products.find(p => normalize(p.name) === normalizedFolder || normalize(p.sku) === normalizedFolder);
                
                // 2. Try Start-With Match (more reliable than 'includes')
                if (!match && normalizedFolder.length > 3) {
                    match = products.find(p => normalize(p.name).startsWith(normalizedFolder) || normalizedFolder.startsWith(normalize(p.name)));
                }

                if (match) {
                    const safeName = match.name.replace(/[\/\\?%*:|"<>]/g, '-').trim();
                    const newProdPath = path.join(catPath, safeName);

                    if (prodPath !== newProdPath) {
                        if (fs.existsSync(newProdPath)) {
                            // Only merge if it's the SAME product
                            const oldFiles = fs.readdirSync(prodPath);
                            oldFiles.forEach(f => {
                                const oldF = path.join(prodPath, f);
                                const newF = path.join(newProdPath, f);
                                if (!fs.existsSync(newF)) fs.renameSync(oldF, newF);
                            });
                            // fs.rmdirSync(prodPath); // Don't delete yet to be safe
                        } else {
                            fs.renameSync(prodPath, newProdPath);
                        }
                    }

                    const activePath = fs.existsSync(newProdPath) ? newProdPath : prodPath;
                    const folderSlug = safeName.replace(/\s+/g, '_');
                    
                    // Rename files
                    let imgIndex = 1;
                    fs.readdirSync(activePath).forEach(file => {
                        const ext = path.extname(file).toLowerCase();
                        if (['.jpeg', '.jpg', '.png', '.webp', '.gif', '.mp4'].includes(ext)) {
                            const newFileName = `${folderSlug}_${imgIndex}${ext}`;
                            const oldFilePath = path.join(activePath, file);
                            if (file !== newFileName && !file.includes(folderSlug)) {
                                fs.renameSync(oldFilePath, path.join(activePath, newFileName));
                                imgIndex++;
                            } else {
                                imgIndex++;
                            }
                        }
                    });

                    // Write Manifests
                    const images = fs.readdirSync(activePath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
                    const mainImg = images.find(img => img.includes('_1.')) || images[0];
                    const readme = `# 📦 ${match.name}\n**SKU:** \`${match.sku}\` | **Segment:** \`${match.segment || 'Standard'}\`\n\n## 🛠️ Specifications\n| Attribute | Value |\n| :--- | :--- |\n| Category | ${match.category?.name || cat} |\n| Size | ${match.commonSpecs?.size || 'N/A'} |\n\n## 🔗 Assets\n${(match.media || []).map((url, i) => `- [Asset ${i+1}](${url})`).join('\n')}\n\n## 🖼️ Preview\n${mainImg ? `![${match.name}](${mainImg})` : '*No image available*'}\n\n---`;
                    fs.writeFileSync(path.join(activePath, 'README.md'), readme);
                    fs.writeFileSync(path.join(activePath, 'metadata.json'), JSON.stringify({ sku: match.sku, name: match.name, files: images }, null, 2));
                    
                    console.log(`✅ Processed: ${match.sku}`);
                }
            }
        }
        console.log('\n🚀 Final Precise Re-Organization Complete!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
reorganize();
