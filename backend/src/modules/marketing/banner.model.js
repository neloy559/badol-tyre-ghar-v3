const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  title:     { type: String },
  subtext:   { type: String },
  image:     { type: String, required: true }, // Cloudinary URL
  link:      { type: String, default: '/catalog' },
  order:     { type: Number, default: 0 },
  isActive:  { type: Boolean, default: true },
  target:    { type: String, enum: ['internal', 'external'], default: 'internal' }
}, { timestamps: true });

module.exports = mongoose.models.Banner || mongoose.model('Banner', BannerSchema);
