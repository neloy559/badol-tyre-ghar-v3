const mongoose = require('mongoose');
const { Schema } = mongoose;

// =============================================
// 🏷️ Brand Schema
// =============================================
const BrandSchema = new Schema({
  name:        { type: String, required: true, unique: true },
  slug:        { type: String, unique: true },
  logo:        String, // ImgBB / Cloudinary URL
  origin:      String, // Country
  description: String,
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

// =============================================
// 📂 Category Schema (Hierarchical)
// =============================================
const CategorySchema = new Schema({
  name:        { type: String, required: true },
  slug:        { type: String, unique: true },
  parentId:    { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  icon:        String, // Lucide icon name
  description: String,
  order:       Number,
}, { timestamps: true });

// =============================================
// 👤 User Schema
// =============================================
const UserSchema = new Schema({
  phone:              { type: String, unique: true, required: true },
  password:           { type: String, required: true, select: false }, // Hashed (bcryptjs)
  role:               { type: String, enum: ['admin', 'editor', 'sales_partner', 'dealer', 'customer'], default: 'customer' },
  isVerified:         { type: Boolean, default: false }, // Manual Admin Approval for B2B
  isDeleted:          { type: Boolean, default: false }, // Soft Delete
  discountMultiplier: { type: Number, default: 1.0 },    // e.g., 0.95 = 5% extra off
  creditLimit:        { type: Number, default: 0 },      // B2B credit in BDT
  paymentTerms:       { type: String, default: 'Cash' }, // e.g., '7 Days', 'Net 30'
  verificationDetails: {
    tradeLicense: String, // ImgBB / Cloudinary URL
    shopImage:    String, // ImgBB / Cloudinary URL
    appliedAt:    Date,
  },
  profile: {
    name:      String,
    shopName:  String,
    address:   String,
    district:  String,
  },
  analytics: {
    deviceType: String, // 'premium', 'mid', 'budget'
    lastIp:     String,
    location:   Object,
    lastActive: Date,
  },
}, { timestamps: true });

// =============================================
// 📦 Product Schema (with Variants)
// =============================================
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
  isDeleted: { type: Boolean, default: false }, // Soft Delete
}, { timestamps: true });

// =============================================
// 🛒 Inquiry Cart Schema (Cloud Synced RFQ)
// =============================================
const InquiryCartSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    variantSku: String,
    quantity:  { type: Number, default: 1 },
  }],
  status: {
    type: String,
    enum: ['active', 'inquired', 'replied', 'converted_to_sale', 'closed'],
    default: 'active',
  },
  saleDetails: { amount: Number, date: Date },
  updatedAt: { type: Date, default: Date.now },
});

// =============================================
// 🏷️ Campaign Schema (Offers / Discounts)
// =============================================
const CampaignSchema = new Schema({
  name: { type: String, required: true }, // e.g., 'Eid Ul Fitr 2026'
  type: { type: String, enum: ['percentage', 'fixed_discount'], required: true },
  value: { type: Number, required: true }, // e.g., 10 for 10%
  appliesTo: {
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    brand:    { type: Schema.Types.ObjectId, ref: 'Brand' },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  startDate:  { type: Date, required: true },
  endDate:    { type: Date, required: true },
  badgeText:  { type: String, default: 'OFFER' },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

// =============================================
// 📍 Shop Schema (Branch Locator)
// =============================================
const ShopSchema = new Schema({
  branchName:  { type: String, required: true },
  managerName: String,
  phone:       { type: String, required: true },
  district:    String,
  address:     String,
  mapLink:     String, // Google Maps URL
  isMainBranch:{ type: Boolean, default: false },
}, { timestamps: true });

// =============================================
// 🛡️ Audit Log Schema (Admin Action Tracking)
// =============================================
const AuditLogSchema = new Schema({
  adminId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action:   { type: String, required: true }, // e.g., 'UPDATE_PRICE', 'VERIFY_DEALER'
  targetId: Schema.Types.ObjectId,
  details: {
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
  },
}, { timestamps: true });

// =============================================
// 📝 Activity Log Schema (Silent Analytics)
// =============================================
const ActivityLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: String, // 'page_view', 'whatsapp_click', 'search_query'
  path:   String,
  ip:     String,
  meta:   Schema.Types.Mixed, // Extra context (search term, productId, etc.)
}, { timestamps: true });

// =============================================
// 🔗 Redirect Schema (SEO 301 Management)
// =============================================
const RedirectSchema = new Schema({
  oldPath:    { type: String, unique: true, required: true },
  newPath:    { type: String, required: true },
  statusCode: { type: Number, default: 301 },
});

// Export all models
module.exports = {
  Brand:        mongoose.models.Brand        || mongoose.model('Brand', BrandSchema),
  Category:     mongoose.models.Category     || mongoose.model('Category', CategorySchema),
  User:         mongoose.models.User         || mongoose.model('User', UserSchema),
  Product:      mongoose.models.Product      || mongoose.model('Product', ProductSchema),
  InquiryCart:  mongoose.models.InquiryCart  || mongoose.model('InquiryCart', InquiryCartSchema),
  Campaign:     mongoose.models.Campaign     || mongoose.model('Campaign', CampaignSchema),
  Shop:         mongoose.models.Shop         || mongoose.model('Shop', ShopSchema),
  AuditLog:     mongoose.models.AuditLog     || mongoose.model('AuditLog', AuditLogSchema),
  ActivityLog:  mongoose.models.ActivityLog  || mongoose.model('ActivityLog', ActivityLogSchema),
  Redirect:     mongoose.models.Redirect     || mongoose.model('Redirect', RedirectSchema),
};
