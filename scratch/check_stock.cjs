const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const database = client.db('btg_v3');
    const products = database.collection('products');
    
    const product = await products.findOne({});
    console.log(JSON.stringify(product.variants, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
