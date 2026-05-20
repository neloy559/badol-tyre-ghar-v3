
const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const path     = require('path');
dotenv.config({ path: path.join(__dirname, '../version-3/api/.env') });

const { Schema } = mongoose;
const ProductSchema = new Schema({ sku: String, name: String, category: Schema.Types.Mixed, brand: Schema.Types.Mixed, media: [String], isDeleted: Boolean }, { strict: false });
const CategorySchema = new Schema({ name: String, slug: String });
const Product  = mongoose.model('Product',  ProductSchema);
const Category = mongoose.model('Category', CategorySchema);

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  const total = await Product.countDocuments({ isDeleted: false });
  console.log(`=== TOTAL PRODUCTS IN DB (not deleted): ${total} ===\n`);

  // 1. What type is 'category' stored as?
  const sample = await Product.find({ isDeleted: false }).limit(5).lean();
  console.log('--- Sample category/brand field types ---');
  sample.forEach(p => {
    console.log(`  [${p.sku}] category: ${JSON.stringify(p.category)} (type: ${typeof p.category}) | brand: ${JSON.stringify(p.brand)} (type: ${typeof p.brand})`);
  });

  // 2. How many products have string vs ObjectId for category?
  const allProds = await Product.find({ isDeleted: false }).lean();
  let stringCat = 0, objCat = 0, nullCat = 0;
  allProds.forEach(p => {
    if (!p.category) nullCat++;
    else if (typeof p.category === 'string') stringCat++;
    else objCat++;
  });
  console.log(`\n--- Category field type breakdown ---`);
  console.log(`  ObjectId refs : ${objCat}`);
  console.log(`  Plain strings : ${stringCat}`);
  console.log(`  Null/missing  : ${nullCat}`);

  // 3. How many Category documents exist?
  const cats = await Category.find().lean();
  console.log(`\n--- Category documents in DB: ${cats.length} ---`);
  cats.forEach(c => console.log(`  slug: "${c.slug}" | name: "${c.name}"`));

  // 4. Image doubling — how many products have duplicate URLs in media[]?
  let doubleCount = 0;
  const doubled = [];
  allProds.forEach(p => {
    if (!p.media || p.media.length === 0) return;
    const unique = new Set(p.media);
    if (unique.size < p.media.length) {
      doubleCount++;
      doubled.push({ sku: p.sku, name: p.name, total: p.media.length, unique: unique.size });
    }
  });
  console.log(`\n--- Products with DUPLICATE images in media[]: ${doubleCount} ---`);
  doubled.slice(0, 10).forEach(p => console.log(`  [${p.sku}] "${p.name}" — ${p.total} total, ${p.unique} unique`));

  // 5. Products with media[] completely empty
  const noMedia = allProds.filter(p => !p.media || p.media.length === 0);
  console.log(`\n--- Products with EMPTY media[]: ${noMedia.length} ---`);
  noMedia.slice(0, 10).forEach(p => console.log(`  [${p.sku}] ${p.name}`));

  process.exit(0);
}
diagnose().catch(e => { console.error(e); process.exit(1); });
