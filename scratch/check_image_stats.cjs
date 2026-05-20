const mongoose = require('mongoose');
require('dotenv').config({ path: './api/.env' });

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Product = mongoose.model('Product', new mongoose.Schema({
      sku: String,
      media: [String],
      isDeleted: Boolean
    }));

    const total = await Product.countDocuments({ isDeleted: false });
    const withImages = await Product.countDocuments({ 
      isDeleted: false, 
      'media.0': { $exists: true } 
    });

    console.log('--- DB IMAGE STATS ---');
    console.log('Total Active Products:', total);
    console.log('Products with ImgBB Links:', withImages);
    console.log('Coverage:', ((withImages / total) * 100).toFixed(2) + '%');
    
    const samples = await Product.find({ 'media.0': { $exists: true } }).limit(3).lean();
    console.log('--- SAMPLE LINKS ---');
    samples.forEach(s => console.log(`${s.sku}: ${s.media[0]}`));

  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
