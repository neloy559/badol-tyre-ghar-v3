require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
  const cats = await Category.find({}).lean();
  console.log('Categories in DB:', cats.map(c => ({ name: c.name, slug: c.slug })));
  process.exit(0);
});
