require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const products = await Product.find({}).limit(20).lean();
  console.log('Sample Data:');
  products.forEach(p => console.log(`Name: "${p.name}" | Current Slug: "${p.slug}"`));
  process.exit(0);
}
check();
