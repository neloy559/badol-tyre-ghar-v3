require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const p = await Product.findOne({ sku: 'BTG-001' }).lean();
  console.log('Product BTG-001:', JSON.stringify(p, null, 2));
  process.exit(0);
});
