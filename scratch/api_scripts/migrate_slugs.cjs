require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special chars
    .replace(/[\s_-]+/g, '-') // replace spaces/underscores/hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // remove leading/trailing hyphens
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  const products = await Product.find({});
  console.log(`Found ${products.length} products to update...`);

  const slugMap = new Map();

  for (const p of products) {
    let newSlug = slugify(p.name);
    if (!newSlug || newSlug.length < 2) newSlug = 'product';
    
    // Collision handling
    let count = 0;
    let finalSlug = newSlug;
    while (slugMap.has(finalSlug)) {
      count++;
      finalSlug = `${newSlug}-${count}`;
    }
    
    slugMap.set(finalSlug, true);
    
    await Product.updateOne({ _id: p._id }, { $set: { slug: finalSlug } });
    console.log(`Updated: "${p.name}" -> ${finalSlug}`);
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrate();
