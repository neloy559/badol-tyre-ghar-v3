require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const fs       = require('fs');
const { Schema } = mongoose;

// ── Minimal Schemas ──────────────────────────────────────────────────────────
const BrandSchema    = new Schema({ name: String, slug: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
const CategorySchema = new Schema({ name: String, slug: String }, { timestamps: true });
const ProductSchema  = new Schema({ sku: String, brand: Schema.Types.Mixed, category: Schema.Types.Mixed, media: [String] }, { strict: false });

const Brand    = mongoose.models.Brand    || mongoose.model('Brand',    BrandSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Product  = mongoose.models.Product  || mongoose.model('Product',  ProductSchema);

// ── Extract SKU -> category/brand from products-seed.js ──────────────────────
const seedContent = fs.readFileSync('d:/Badol Tyre Ghar - Products/BTG website_v2/lib/products-seed.js', 'utf8');
const startIdx    = seedContent.indexOf('export const products = ') + 'export const products = '.length;
const endIdx      = seedContent.indexOf('export const CATEGORIES');
let jsonStr       = seedContent.substring(startIdx, endIdx).trim();
if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1);
const seedProducts = JSON.parse(jsonStr);
console.log(`Loaded ${seedProducts.length} products from seed file.`);

// Build SKU -> { category, brand } lookup
const skuMap = {};
seedProducts.forEach(p => { skuMap[p.sku] = { category: p.category, brand: p.brand }; });

// All unique categories & brands
const uniqueCats   = [...new Set(seedProducts.map(p => p.category).filter(Boolean))];
const uniqueBrands = [...new Set(seedProducts.map(p => p.brand).filter(Boolean))];
console.log(`Unique categories (${uniqueCats.length}):`, uniqueCats.join(', '));
console.log(`Unique brands     (${uniqueBrands.length}):`, uniqueBrands.join(', '));

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('\nConnected to MongoDB Atlas.\n');

  // ── STEP 1: Upsert Category documents ────────────────────────────────────
  const catIdMap = {};
  console.log('--- Creating Categories ---');
  for (const name of uniqueCats) {
    const slug = slugify(name);
    const doc  = await Category.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug } },
      { upsert: true, new: true }
    );
    catIdMap[name] = doc._id;
    console.log(`  ✅ "${name}" → slug: "${slug}" → _id: ${doc._id}`);
  }

  // ── STEP 2: Upsert Brand documents ───────────────────────────────────────
  const brandIdMap = {};
  console.log('\n--- Creating Brands ---');
  for (const name of uniqueBrands) {
    const slug = slugify(name);
    const doc  = await Brand.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name, slug, isActive: true } },
      { upsert: true, new: true }
    );
    brandIdMap[name] = doc._id;
    console.log(`  ✅ "${name}" → slug: "${slug}"`);
  }

  // ── STEP 3: Backfill category/brand on all products & dedupe media[] ─────
  console.log('\n--- Backfilling Products ---');
  let updated = 0, skipped = 0, deduped = 0;
  const allProducts = await Product.find({}).lean();

  for (const p of allProducts) {
    const seed = skuMap[p.sku];
    if (!seed) { skipped++; continue; }

    const catId   = catIdMap[seed.category];
    const brandId = brandIdMap[seed.brand];

    // Deduplicate media[]
    const uniqueMedia = [...new Set(p.media || [])];
    if (uniqueMedia.length < (p.media || []).length) deduped++;

    const updateFields = { media: uniqueMedia };
    if (catId)   updateFields.category = catId;
    if (brandId) updateFields.brand    = brandId;

    await Product.updateOne({ _id: p._id }, { $set: updateFields });
    updated++;
  }

  // ── STEP 4: Final verification ────────────────────────────────────────────
  console.log('\n======== MIGRATION COMPLETE ========');
  console.log(`Products updated  : ${updated}`);
  console.log(`Products skipped  : ${skipped}`);
  console.log(`Media deduped     : ${deduped}`);
  const finalCats = await Category.countDocuments();
  const finalBrands = await Brand.countDocuments();
  console.log(`Category docs in DB : ${finalCats}`);
  console.log(`Brand docs in DB    : ${finalBrands}`);

  // Spot-check: one product should now have an ObjectId for category
  const spot = await Product.findOne({ sku: 'BTG-032' }).populate('category', 'name slug').lean();
  console.log(`\nSpot-check BTG-032: category = ${JSON.stringify(spot?.category)}`);

  process.exit(0);
}

migrate().catch(e => { console.error('MIGRATION FAILED:', e.message); process.exit(1); });
