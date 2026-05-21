const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * SearchLog — captures every user search term for SEO intelligence.
 * Fire-and-forget: never blocks the main API response.
 */
const SearchLogSchema = new Schema({
  term: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  count: {
    type: Number,
    default: 1,
  },
  resultCount: {
    type: Number,
    default: 0, // 0 = zero-result search (most actionable)
  },
  lastSearchedAt: {
    type: Date,
    default: Date.now,
  },
  // Optional: track if any result was clicked after this search
  clickCount: {
    type: Number,
    default: 0,
  },
  // Tag assigned to a product/category from this search term
  assignedTo: {
    productId:  { type: Schema.Types.ObjectId, ref: 'Product',  default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  isAssigned: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Compound index for fast upsert by term
SearchLogSchema.index({ term: 1 }, { unique: true });

module.exports = mongoose.models.SearchLog || mongoose.model('SearchLog', SearchLogSchema);
