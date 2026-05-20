require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const fs = require('fs');

async function exportToCSV() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Register ad-hoc schemas for the export script
  const Product = mongoose.model('Product', new mongoose.Schema({
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }
  }, { strict: false }));
  const Category = mongoose.model('Category', new mongoose.Schema({ name: String }, { strict: false }));
  const Brand = mongoose.model('Brand', new mongoose.Schema({ name: String }, { strict: false }));

  const products = await Product.find({})
    .populate('category', 'name')
    .populate('brand', 'name')
    .lean();

  const headers = [
    'ID', 'Slug', 'Name', 'Category', 'Brand', 
    'Original_Price', 'Discounted_Price', 'Stock_Status', 
    'Image_URL_1', 'Image_URL_2', 'Image_URL_3',
    'Size', 'Rim', 'Ply', 'Pattern', 'Origin', 'Description'
  ];

  const rows = products.map(p => {
    const variant = p.variants?.[0] || {};
    return [
      p._id,
      p.slug || '',
      `"${p.name}"`,
      `"${p.category?.name || ''}"`,
      `"${p.brand?.name || ''}"`,
      variant.originalPrice || 0,
      variant.price || 0,
      variant.stockLabel || 'in_stock',
      p.media?.[0] || '',
      p.media?.[1] || '',
      p.media?.[2] || '',
      `"${p.commonSpecs?.size || ''}"`,
      `"${p.commonSpecs?.rim || ''}"`,
      `"${variant.ply || ''}"`,
      `"${p.commonSpecs?.pattern || ''}"`,
      `"${p.commonSpecs?.origin || ''}"`,
      `"${p.description || ''}"`
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync('BTG_Master_Product_Template.csv', csvContent);
  
  console.log('CSV Exported: BTG_Master_Product_Template.csv');
  process.exit(0);
}

exportToCSV();
