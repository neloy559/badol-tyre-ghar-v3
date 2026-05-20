const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/Badol Tyre Ghar - Products/version-3/backend/.env' });

const Product = require('d:/Badol Tyre Ghar - Products/version-3/backend/src/modules/catalog/models/Product');

async function checkImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const sample = await Product.findOne({ media: { $exists: true, $ne: [] } }).lean();
    if (sample) {
      console.log('Sample Product Media:', sample.media);
    } else {
      console.log('No products with media found.');
    }

    const count = await Product.countDocuments({ media: /cloudinary\.com/ });
    console.log(`Products with Cloudinary URLs: ${count}`);

    const total = await Product.countDocuments();
    console.log(`Total Products: ${total}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkImages();
