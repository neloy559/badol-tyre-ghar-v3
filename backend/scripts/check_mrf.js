require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Brand = require('../src/modules/catalog/models/Brand');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const mrf = await Brand.find({ name: /MRF/i }).lean();
  console.log("MRF Brands in DB:");
  mrf.forEach(b => console.log(b));
  process.exit(0);
}
run();
