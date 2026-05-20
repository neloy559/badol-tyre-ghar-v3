const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

// Function to clean name for matching
const normalize = (name) => {
    return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove everything except alphanumeric
        .trim();
};

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

                // 1. Find Match in DB using Normalized Names
                const normalizedFolder = normalize(prodFolder);
                let match = products.find(p => normalize(p.name) === normalizedFolder);
                
                // Extra fuzzy: if folder is part of DB name (e.g., "Arson" in "Arson 500ml")
                if (!match) {
                    match = products.find(p => normalize(p.name).includes(normalizedFolder) || normalizedFolder.includes(normalize(p.name)));
                }

                if (match) {
                    const safeName = match.name.replace(/[\/\\?%*:|"<>]/g, '-').trim();
                    const newProdPath = path.join(catPath, safeName);

                    // 2. Rename Folder
                    if (prodPath !== newProdPath) {
                        if (fs.existsSync(newProdPath) && prodPath !== newProdPath) {
                            // Move files from old to new and delete old
                            const oldFiles = fs.readdirSync(prodPath);
                            oldFiles.forEach(f => {
                                const oldF = path.join(prodPath, f);
                                const newF = path.join(newProdPath, f);
                                if (!fs.existsSync(newF)) fs.renameSync(oldF, newF);
                            });
                            fs.rmdirSync(prodPath);
                            console.log(`Merged ${prodFolder} -> ${safeName}`);
                        } else {
                            fs.renameSync(prodPath, newProdPath);
                        }
                    }

                    const activePath = fs.existsSync(newProdPath) ? newProdPath : prodPath;

                    // 3. Rename Images
                    const files = fs.readdirSync(activePath);
                    let imgIndex = 1;
                    const folderNameSlug = safeName.replace(/\s+/g, '_');
                    
                    files.forEach(file => {
                        const ext = path.extname(file).toLowerCase();
                        if (['.jpeg', '.jpg', '.png', '.webp', '.gif', '.mp4'].includes(ext)) {
                            const newFileName = `${folderNameSlug}_${imgIndex}${ext}`;
                            const oldFilePath = path.join(activePath, file);
                            const newFilePath = path.join(activePath, newFileName);
                            
                            if (file !== newFileName && !file.includes(folderNameSlug)) {
                                fs.renameSync(oldFilePath, newFilePath);
                                imgIndex++;
                            } else {
                                imgIndex++;
                            }
                        }
                    });

                    // 4. Update README.md
                    const images = fs.readdirSync(activePath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
                    const mainImg = images.find(img => img.includes('_1.')) || images[0];

                    const readme = [
                        `# 📦 ${match.name}`,
                        `**SKU:** \`${match.sku}\` | **Segment:** \`${match.segment || 'Standard'}\` | **Category:** \`${match.category?.name || cat}\``,
                        `\n## 🛠️ Specifications`,
                        `| Attribute | Value |`,
                        `| :--- | :--- |`,
                        `| Size | ${match.commonSpecs?.size || 'N/A'} |`,
                        `| Pattern | ${match.commonSpecs?.pattern || 'N/A'} |`,
                        `| Rim | ${match.commonSpecs?.rim || 'N/A'} |`,
                        `| Origin | ${match.commonSpecs?.origin || 'N/A'} |`,
                        `| Packing | ${match.packingSize || 'N/A'} |`,
                        `\n## 🔗 Cloud Assets (ImgBB)`,
                        ...(match.media || []).map((url, i) => `- [Asset ${i+1}](${url})`),
                        `\n## 🖼️ Preview`,
                        mainImg ? `![${match.name}](${mainImg})` : `*No image available*`,
                        `\n---`,
                        `*Verified on ${new Date().toLocaleDateString()}*`
                    ].join('\n');

                    fs.writeFileSync(path.join(activePath, 'README.md'), readme);

                    // 5. Update metadata.json
                    const metadata = {
                        id: match._id,
                        sku: match.sku,
                        name: match.name,
                        category: match.category?.name,
                        segment: match.segment,
                        specs: match.commonSpecs,
                        packingSize: match.packingSize,
                        cloudMedia: match.media,
                        localFiles: fs.readdirSync(activePath).filter(f => /\.(jpe?g|png|webp|gif|mp4)$/i.test(f)),
                        lastSync: new Date().toISOString()
                    };

                    fs.writeFileSync(path.join(activePath, 'metadata.json'), JSON.stringify(metadata, null, 2));
                    console.log(`✅ Processed: ${match.sku} - ${match.name}`);
                }
            }
        }
        console.log('\n🚀 SMART Re-Organization Complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Re-org failed:', err);
        process.exit(1);
    }
}

reorganize();
