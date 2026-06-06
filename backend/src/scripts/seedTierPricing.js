const TierPricingRule = require('../modules/users/tierPricing.model.js');

const DEFAULT_TIER_RULES = [
  { tier: 'standard', discountPercent: 0, label: 'Standard', description: 'No discount' },
  { tier: 'silver', discountPercent: 5, label: 'Silver', description: '5% off public price' },
  { tier: 'gold', discountPercent: 10, label: 'Gold', description: '10% off public price' },
  { tier: 'platinum', discountPercent: 15, label: 'Platinum', description: '15% off public price' },
];

async function seedTierPricing() {
  const count = await TierPricingRule.countDocuments();

  if (count > 0) {
    console.log('TierPricingRule already seeded, skipping.');
    return;
  }

  await TierPricingRule.insertMany(DEFAULT_TIER_RULES);
  console.log('TierPricingRule seeded successfully with 4 default rules.');
}

module.exports = { seedTierPricing };
