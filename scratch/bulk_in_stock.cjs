const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const updateStock = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined in env');
    console.log('URI found:', uri.substring(0, 20) + '...');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected.');

    const Product = require('../backend/src/modules/catalog/models/Product');

    console.log('Testing read...');
    const product = await Product.findOne({});
    console.log('Found product:', product ? product.name : 'null');
    
    // Update all variants of all products
    const result = await Product.updateMany(
      { isDeleted: false },
      { $set: { "variants.$[].inventory.stock": 100 } }
    );

    console.log(`Success! Updated ${result.modifiedCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

updateStock();
