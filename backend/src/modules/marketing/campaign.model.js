const mongoose = require('mongoose');
const { Schema } = mongoose;

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

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
