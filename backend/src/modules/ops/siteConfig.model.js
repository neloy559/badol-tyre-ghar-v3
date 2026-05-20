const mongoose = require('mongoose');

const SiteConfigSchema = new mongoose.Schema({
  key:      { type: String, default: 'main_config', unique: true }, // For singleton pattern
  logo:     { type: String }, // Cloudinary URL
  favicon:  { type: String },
  branding: {
    name:         { type: String, default: 'Badol Tyre Ghar' },
    slogan:       { type: String, default: 'Premium Quality at Wholesale Rates' },
    footerText:   { type: String },
  },
  contact: {
    phone:        { type: String },
    whatsapp:     { type: String },
    email:        { type: String },
    address:      { type: String },
    mapsLink:     { type: String },
  },
  social: {
    facebook:     { type: String },
    youtube:      { type: String },
    instagram:    { type: String },
  }
}, { timestamps: true });

module.exports = mongoose.models.SiteConfig || mongoose.model('SiteConfig', SiteConfigSchema);
