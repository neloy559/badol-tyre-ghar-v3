/**
 * 💰 PricingService
 * Centralized logic for calculating final prices based on user role, 
 * dealer multipliers, and active marketing campaigns.
 */

const PricingService = {
  
  /**
   * Calculate final pricing for a set of variants
   */
  processVariants: (variants = [], { role, multiplier = 1.0, campaign = null }) => {
    return (variants || []).map((v) => {
      // 1. Base Price Selection (B2B vs B2C)
      let basePrice = (role === 'dealer' || role === 'sales_partner')
        ? Math.round((v.pricing?.wholesale || 0) * multiplier)
        : (v.pricing?.retail || 0);

      // 2. Apply Marketing Campaign (if active)
      let finalPrice = basePrice;
      let originalPrice = null;

      if (campaign) {
        originalPrice = basePrice;
        const discount = campaign.type === 'percentage'
          ? (basePrice * campaign.value / 100)
          : campaign.value;
        
        finalPrice = Math.max(0, Math.round(basePrice - discount));
      }

      return {
        sku: v.sku,
        ply: v.ply,
        designModel: v.designModel,
        price: finalPrice,
        originalPrice: originalPrice,
        stock: v.inventory?.stock || 0,
        stockLabel: PricingService.getStockLabel(v.inventory?.stock || 0),
      };
    });
  },

  /**
   * Helper to determine stock status labels
   */
  getStockLabel: (stock) => {
    if (stock <= 0)  return 'out_of_stock';
    if (stock <= 20) return 'limited';
    return 'in_stock';
  }
};

module.exports = PricingService;
