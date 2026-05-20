const mongoose = require('mongoose');
const { Schema } = mongoose;

const BrandSchema = new Schema({
  name:        { type: String, required: true, unique: true },
  slug:        { type: String, unique: true },
  logo:        String, // ImgBB / Cloudinary URL
  origin:      String, // Country
  description: String,
  categories:  [{ type: String }], // Array of category slugs this brand belongs to
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.Brand || mongoose.model('Brand', BrandSchema);
