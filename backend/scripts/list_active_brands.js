require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Brand = require('../src/modules/catalog/models/Brand');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const brands = await Brand.find({ isActive: true }).sort({ name: 1 }).lean();
  console.log("Active Brands in DB:");
  console.log(brands.map(b => b.name).join(', '));
  process.exit(0);
}
run();
