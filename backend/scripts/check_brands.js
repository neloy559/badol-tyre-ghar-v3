require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Brand = require('../src/modules/catalog/models/Brand');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const brands = await Brand.find({}).lean();
  console.log("Current Brands:");
  brands.forEach(b => console.log(`- ${b.name} (${b.slug}) [ID: ${b._id}]`));
  process.exit(0);
}
run();
