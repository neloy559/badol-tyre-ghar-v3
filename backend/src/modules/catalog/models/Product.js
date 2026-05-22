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

  // ── Category-Specific Specs ────────────────────────────────
  // Structured fields for known categories (Tyres, Tubes, Flaps, Sealants, Patches, Gadgets)
  categorySpecs: {
    // Tyres only
    plyRating:    String, // e.g. '6PR', '8PR', '14PR' — Tyres ONLY (tubes/flaps have no ply)
    pattern:      String, // e.g. 'Rib', 'Block', 'Knobby' — Tyres only
    // Tyres + Tubes + Flaps
    rimSize:      String, // e.g. '17"', '16"'
    vehicleType:  String, // e.g. 'Motorcycle', 'CNG', 'Truck'
    // Tubes only
    valveType:    String, // e.g. 'Dunlop', 'Schrader', 'Woods'
    tubeMaterial: String, // e.g. 'Butyl Rubber', 'Natural Rubber'
    // Flaps only
    flapMaterial: String, // e.g. 'Rubber', 'Rubber/Plastic Blend'
    // Tyre Sealants
    volume:         String, // e.g. '500ml', '1000ml', '1100ml', '800ml'
    formulaType:    String, // e.g. 'Latex', 'Synthetic Polymer'
    compatibleWith: String, // e.g. 'Tubeless', 'Tube-type', 'Both'
    application:    String, // e.g. 'Motorcycle', 'Car', 'Truck'
    // Patches
    patchType:    String, // e.g. 'Cold Patch', 'Hot Patch', 'Sheet'
    // Gadgets
    gadgetType:   String, // e.g. 'Air Pressure Meter', 'Nozzle', 'Repair Kit'
    material:     String, // e.g. 'Steel', 'Plastic', 'Rubber'
  },

  // Flexible custom specs — admin can add any key-value pair
  // e.g. [{ key: 'Thread Count', value: '120 TPI' }]
  customSpecs: [{
    key:   { type: String, required: true },
    value: { type: String, required: true },
  }],

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
