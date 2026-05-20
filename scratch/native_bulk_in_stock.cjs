const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    console.log('Connecting to Atlas via native driver...');
    await client.connect();
    console.log('Connected.');
    
    const database = client.db('btg_v3');
    const products = database.collection('products');
    
    const result = await products.updateMany(
      { isDeleted: false },
      { $set: { "variants.$[].inventory.stock": 100 } }
    );
    console.log(`Updated ${result.modifiedCount} products.`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
