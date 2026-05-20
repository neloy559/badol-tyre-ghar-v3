const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const prods = await Product.find({ isDeleted: false, media: { $exists: true, $not: {$size: 0} } }).lean();
  
  const imgToSkus = {};
  prods.forEach(p => {
    p.media.forEach(m => {
      imgToSkus[m] = imgToSkus[m] || [];
      imgToSkus[m].push(p.name + ' (' + p.sku + ')');
    });
  });
  
  const shared = Object.entries(imgToSkus).filter(([m, skus]) => skus.length > 1);
  console.log('Images shared across multiple products:', shared.length);
  shared.slice(0, 10).forEach(([m, skus]) => {
    console.log('Image:', m);
    console.log('  Used by:', skus.join(', '));
  });
  process.exit(0);
});
