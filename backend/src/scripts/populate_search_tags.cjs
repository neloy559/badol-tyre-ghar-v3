const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Fallback if not loaded
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '../../../.env') });
}

const Product = require('../modules/catalog/models/Product');
const Brand = require('../modules/catalog/models/Brand');
const Category = require('../modules/catalog/models/Category');
const { generateProductTags } = require('../utils/searchHelper');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment!');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected successfully!');

  try {
    // 1. Drop existing search index so it can be rebuilt with new weights and fields
    console.log('Dropping old ProductSearchIndex...');
    try {
      await Product.collection.dropIndex('ProductSearchIndex');
      console.log('Old index dropped successfully.');
    } catch (e) {
      console.log('Could not drop index (might not exist yet):', e.message);
    }

    // 2. Fetch all products, brands, categories
    console.log('Fetching all records...');
    const products = await Product.find({ isDeleted: false });
    const brands = await Brand.find({ isActive: true }).lean();
    const categories = await Category.find({ isActive: { $ne: false } }).lean();

    const brandMap = brands.reduce((acc, b) => {
      acc[String(b._id)] = b.name;
      return acc;
    }, {});

    const categoryMap = categories.reduce((acc, c) => {
      acc[String(c._id)] = c.name;
      return acc;
    }, {});

    console.log(`Processing ${products.length} products...`);
    let count = 0;

    for (const product of products) {
      const brandName = brandMap[String(product.brand)] || '';
      const categoryName = categoryMap[String(product.category)] || '';
      
      // Preserve existing manual tags if any, clean up any auto tags
      const currentTags = product.searchTags || [];
      
      const tags = generateProductTags(product, brandName, categoryName, currentTags);
      
      product.searchTags = tags;
      await product.save();
      count++;
    }

    console.log(`Successfully populated search tags for ${count} products.`);

    // 3. Rebuild indexes
    console.log('Rebuilding indexes (Mongoose will create the new ProductSearchIndex)...');
    await Product.createIndexes();
    console.log('Indexes rebuilt successfully!');

  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
