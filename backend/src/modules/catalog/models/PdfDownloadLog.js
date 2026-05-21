const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * PdfDownloadLog — tracks every PDF download by dealers.
 * Answers: who downloaded what, when, and on what network.
 */
const PdfDownloadLogSchema = new Schema({
  categorySlug:  { type: String, required: true, index: true },
  userId:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
  userPhone:     { type: String, default: null },
  versionHash:   { type: String, default: null }, // which version they downloaded
  networkType:   { type: String, enum: ['wifi', 'cellular', 'unknown'], default: 'unknown' },
  fromCache:     { type: Boolean, default: false }, // was it served from device cache?
  ip:            { type: String, default: null },
}, { timestamps: true });

// TTL index — auto-delete logs older than 1 year to keep DB clean
PdfDownloadLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.models.PdfDownloadLog || mongoose.model('PdfDownloadLog', PdfDownloadLogSchema);
