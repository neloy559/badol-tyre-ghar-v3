const TierPricingRule = require('../modules/users/tierPricing.model');

// In-memory cache: Map<tier, { discountPercent, expiresAt }>
const _cache = new Map();
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Returns the tier-adjusted price for a dealer.
 *
 * @param {number} publicPrice - The base public/wholesale price
 * @param {string} tier - The dealer's tier (standard | silver | gold | platinum)
 * @returns {Promise<number>} - Adjusted price rounded to 2 decimal places
 */
async function getDealerPrice(publicPrice, tier) {
  const now = Date.now();
  const cached = _cache.get(tier);

  let discountPercent = 0;

  if (cached && cached.expiresAt > now) {
    discountPercent = cached.discountPercent;
  } else {
    const rule = await TierPricingRule.findOne({ tier });
    if (rule) {
      discountPercent = rule.discountPercent;
      _cache.set(tier, { discountPercent, expiresAt: now + CACHE_TTL_MS });
    }
    // If not found: discountPercent stays 0 (fallback for unknown tiers — Req 4.2)
  }

  const adjustedPrice = publicPrice * (1 - discountPercent / 100);
  return Math.round(adjustedPrice * 100) / 100;
}

module.exports = { getDealerPrice };
