const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
  sku:         { type: String, unique: true, required: true },
  slug:        { type: String, unique: true },
  name:        { type: String, required: true },
  brand:       { type: Schema.Types.ObjectId, ref: 'Brand' },
  category:    { type: Schema.Types.ObjectId, ref: 'Category' },
  subCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
  media:       [String], // ImgBB / Cloudinary URLs
  commonSpecs: {
    size:    String,
    pattern: String,
    rim:     String,
    origin:  String,
  },
  segment:     { type: String, enum: ['Premium', 'Balanced', 'Budget', 'Standard', ''], default: '' },
  packingSize: String, // e.g., '24 pc/cartoon'
  relatedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }], // Upselling
  variants: [{
    sku:         { type: String },
    ply:         String, // e.g., '14PR', '16PR'
    designModel: String, // e.g., 'G2', 'E3'
    pricing: {
      retail:    { type: Number, default: 0 },
      wholesale: { type: Number, default: 0 },
    },
    inventory: { stock: { type: Number, default: 0 } },
  }],
  meta: {
    views:    { type: Number, default: 0 },
    inquiries:{ type: Number, default: 0 },
  },
  searchTags: { type: [String], default: [] }, // Custom and auto-generated search aliases
  customTags: { type: [String], default: [] }, // Manually typed tags (for Tags Manager UI)
  isVisible:  { type: Boolean, default: true  }, // Show/Hide on public site
  showPrice:  { type: Boolean, default: true  }, // Show/Hide pricing on public site
  isDeleted: { type: Boolean, default: false }, // Soft Delete
}, { timestamps: true });

// 🚀 High-Performance Indexes
ProductSchema.index({ 
  name: 'text', 
  'commonSpecs.size': 'text', 
  sku: 'text',
  'variants.designModel': 'text',
  searchTags: 'text'
}, {
  weights: {
    name: 10,
    searchTags: 5,
    sku: 5,
    'commonSpecs.size': 3,
    'variants.designModel': 2
  },
  name: 'ProductSearchIndex'
});

ProductSchema.index({ category: 1 });
ProductSchema.index({ brand: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
