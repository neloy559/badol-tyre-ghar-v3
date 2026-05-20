require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const badImages = [
    'https://i.ibb.co/4nXb3D8n/10-00-20-1.jpg',
    'https://i.ibb.co/6a992WW/flap-placeholder.jpg',
    'https://i.ibb.co/placeholder.jpg'
  ];
  
  console.log('Starting Targeted DB Image Cleanup...');
  
  let totalCleaned = 0;
  for (const badImg of badImages) {
    const result = await Product.updateMany(
      { media: badImg },
      { $pull: { media: badImg } }
    );
    totalCleaned += result.modifiedCount;
    console.log(`Removed ${badImg} from ${result.modifiedCount} products.`);
  }
  
  console.log(`Total cleaned: ${totalCleaned}`);
  process.exit(0);
});
