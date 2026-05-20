const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Product } = require('../api/models');
require('dotenv').config({ path: '../api/.env' });

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const root = path.join(__dirname, '../assets_master/products/Tyre Sealants');
        
        const fixes = [
            { folder: 'AR Mobile - 1000ml', sku: 'BTG-061' },
            { folder: 'Arson (Pipe Gel) - 1000 ml', sku: 'BTG-064' },
            { folder: 'R Michel - 800ml', sku: 'BTG-074' }
        ];

        for (const f of fixes) {
            const oldPath = path.join(root, f.folder);
            if (!fs.existsSync(oldPath)) {
                console.log(`Skipping ${f.folder} - not found`);
                continue;
            }

            const match = await Product.findOne({ sku: f.sku }).populate('category');
            if (match) {
                const safeName = match.name.replace(/[\/\\?%*:|"<>]/g, '-').trim();
                const newPath = path.join(root, safeName);
                
                if (oldPath !== newPath && !fs.existsSync(newPath)) {
                    fs.renameSync(oldPath, newPath);
                }
                
                const activePath = fs.existsSync(newPath) ? newPath : oldPath;
                const slug = match.name.replace(/\s+/g, '_');
                
                const files = fs.readdirSync(activePath);
                let idx = 1;
                files.forEach(file => {
                    const ext = path.extname(file).toLowerCase();
                    if (['.jpeg', '.jpg', '.png'].includes(ext)) {
                        const newName = `${slug}_${idx}${ext}`;
                        if (file !== newName) fs.renameSync(path.join(activePath, file), path.join(activePath, newName));
                        idx++;
                    }
                });

                // Generate minimal README for now
                fs.writeFileSync(path.join(activePath, 'README.md'), `# ${match.name}\nSKU: ${match.sku}\n\n![Preview](${slug}_1.jpeg)`);
                fs.writeFileSync(path.join(activePath, 'metadata.json'), JSON.stringify({ sku: match.sku, name: match.name, files: fs.readdirSync(activePath).filter(f => /\.(jpe?g|png)$/i.test(f)) }, null, 2));
                
                console.log(`✅ Fixed: ${f.sku} -> ${match.name}`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fix();
