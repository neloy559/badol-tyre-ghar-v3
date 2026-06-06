const mongoose = require('mongoose');
const { Schema } = mongoose;

const TierPricingRuleSchema = new Schema(
  {
    tier: {
      type: String,
      required: true,
      enum: ['standard', 'silver', 'gold', 'platinum'],
      unique: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.TierPricingRule ||
  mongoose.model('TierPricingRule', TierPricingRuleSchema);
