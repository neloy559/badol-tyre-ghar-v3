require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Brand = require('../src/modules/catalog/models/Brand');
const Product = require('../src/modules/catalog/models/Product');

const mapping = {
  'common': ['BTG', 'Local', 'Imported'],
  'tyres': ['Hussain', 'Tourino', 'MTF', 'Zess', 'Rupsha', 'MRF', 'CEAT', 'CST', 'Gazi', 'Osaka Japan', 'RFL', 'Akij'],
  'tubes': ['Hussain', 'Tourino', 'MTF', 'Sakura', 'Zess', 'Rupsha', 'MRF', 'CEAT', 'CST', 'Gazi', 'Osaka Japan', 'RFL', 'Akij'],
  'flaps': ['Hussain', 'Zess', 'MTF', 'Sakura'],
  'tyre-sealants': ['Arson', 'B+', 'NS Best', 'Quick Best', 'Total', 'Omni', 'MRF', 'V-Fast', 'B-Fast', 'Michel', 'RV Fast', 'RMB', 'Sun Power'],
  'patches': ['Omni', 'Dunlope', 'Elephant', 'Big Stone', 'Centech Radial', 'Dollo', 'Gazi', 'Sun', 'Core']
};

const allCategories = ['tyres', 'tubes', 'flaps', 'tyre-sealants', 'patches', 'gadgets'];

// Build the expected brands map: { BrandName: ['cat1', 'cat2'] }
const expectedBrands = {};

for (const [cat, brands] of Object.entries(mapping)) {
  brands.forEach(b => {
    const brandName = b.trim();
    if (!expectedBrands[brandName]) {
      expectedBrands[brandName] = new Set();
    }
    if (cat === 'common') {
      allCategories.forEach(c => expectedBrands[brandName].add(c));
    } else {
      expectedBrands[brandName].add(cat);
    }
  });
}

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // 1. Upsert all expected brands
    console.log('--- UPSERTING BRANDS ---');
    for (const [brandName, categoriesSet] of Object.entries(expectedBrands)) {
      const slug = slugify(brandName);
      const categoriesArray = Array.from(categoriesSet);
      
      const existing = await Brand.findOne({ 
        $or: [{ name: brandName }, { slug: slug }] 
      });

      if (existing) {
        existing.categories = categoriesArray;
        existing.name = brandName; // Ensure correct case
        await existing.save();
        console.log(`[UPDATED] ${brandName} -> ${categoriesArray.join(',')}`);
      } else {
        await Brand.create({
          name: brandName,
          slug: slug,
          categories: categoriesArray,
          isActive: true
        });
        console.log(`[CREATED] ${brandName} -> ${categoriesArray.join(',')}`);
      }
    }

    // 2. Find brands NOT in the expected list
    console.log('\n--- CLEANUP UNEXPECTED BRANDS ---');
    const allBrands = await Brand.find({});
    const expectedBrandNames = Object.keys(expectedBrands).map(b => b.toLowerCase());
    
    for (const brand of allBrands) {
      if (!expectedBrandNames.includes(brand.name.toLowerCase())) {
        // This is an unexpected brand (e.g. 'Hussain, Zess')
        const productCount = await Product.countDocuments({ brand: brand._id });
        if (productCount === 0) {
          await Brand.deleteOne({ _id: brand._id });
          console.log(`[DELETED] ${brand.name} (0 products)`);
        } else {
          // Has products! We shouldn't blindly delete it. Let's mark it inactive so it doesn't show in standard dropdowns
          brand.isActive = false;
          await brand.save();
          console.log(`[INACTIVATED] ${brand.name} (Has ${productCount} products)`);
        }
      }
    }

    console.log('\nMigration Completed Successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    mongoose.disconnect();
  }
}

run();
