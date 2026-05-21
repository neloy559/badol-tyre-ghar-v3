const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * PdfManifest — tracks pre-generated PDF state per category.
 * One document per category slug + 'all' for the full catalog.
 */
const PdfManifestSchema = new Schema({
  categorySlug: {
    type: String,
    required: true,
    unique: true, // one record per category
    index: true,
  },
  categoryLabel: { type: String, required: true },

  // Cloudinary raw file URL — served directly to dealers
  pdfUrl: { type: String, default: null },

  // MD5 hash of (productIds + prices + updatedAt) — used for cache invalidation
  versionHash: { type: String, default: null },

  // When was this PDF last generated
  generatedAt: { type: Date, default: null },

  // How many products were included
  productCount: { type: Number, default: 0 },

  // Generation status
  status: {
    type: String,
    enum: ['pending', 'generating', 'ready', 'failed'],
    default: 'pending',
  },

  // Error message if generation failed
  error: { type: String, default: null },

  // Download analytics
  downloadCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.PdfManifest || mongoose.model('PdfManifest', PdfManifestSchema);
