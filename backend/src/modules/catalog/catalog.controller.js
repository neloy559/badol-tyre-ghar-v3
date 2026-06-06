const Product   = require('./models/Product');
const Category  = require('./models/Category');
const Brand     = require('./models/Brand');
const Campaign  = require('../marketing/campaign.model');
const SearchLog = require('./models/SearchLog');
const PricingService = require('../../utils/PricingService');
const TierPricingService = require('../../utils/TierPricingService');
const { sendSuccess, sendError } = require('../../utils/sendResponse');
const { toEnglishDigits } = require('../../utils/searchHelper');

/**
 * Silent search term logger — fire-and-forget, never blocks response.
 * Upserts by term: increments count and updates resultCount + lastSearchedAt.
 */
const logSearchTerm = (term, resultCount = 0) => {
  if (!term || term.trim().length < 2) return;
  const normalized = term.trim().toLowerCase();
  SearchLog.findOneAndUpdate(
    { term: normalized },
    {
      $inc: { count: 1 },
      $set: { resultCount, lastSearchedAt: new Date() },
    },
    { upsert: true, new: true }
  ).exec().catch(() => {}); // swallow errors — never crash main flow
};

// ── Helpers ────────────────────────────────────────────────────

/**
 * Build Category Tree Recursive Helper
 */
const buildCategoryTree = (categories, parentId = null) => {
  const tree = [];
  categories
    .filter((c) => {
      // Robust check: matches if parentId is null/undefined AND we are looking for roots
      if (!parentId || parentId === null) {
        return !c.parentId || c.parentId === null;
      }
      return String(c.parentId) === String(parentId);
    })
    .forEach((c) => {
      const children = buildCategoryTree(categories, c._id);
      if (children.length > 0) c.children = children;
      tree.push(c);
    });
  return tree;
};

// ── Campaign Cache (BUG-035 fix) ──────────────────────────────
// Caches active campaigns in memory for 60 seconds to avoid a DB
// query on every single product list request.
let _campaignCache = null;
let _campaignCacheAt = 0;
const CAMPAIGN_TTL_MS = 60 * 1000;

const getActiveCampaigns = async () => {
  const now = Date.now();
  if (_campaignCache && (now - _campaignCacheAt) < CAMPAIGN_TTL_MS) {
    return _campaignCache;
  }
  const campaigns = await Campaign.find({
    isActive: true,
    startDate: { $lte: new Date(now) },
    endDate:   { $gte: new Date(now) }
  }).sort({ value: -1 }).lean();
  _campaignCache   = campaigns;
  _campaignCacheAt = now;
  return campaigns;
};

const matchActiveCampaign = (product, activeCampaigns) => {
  if (!activeCampaigns || activeCampaigns.length === 0) return null;
  const categoryId = product.category?._id || product.category;
  const brandId    = product.brand?._id    || product.brand;

  return activeCampaigns.find(c => {
    const appliesTo = c.appliesTo || {};
    
    // Check product match
    const productMatch = appliesTo.products && appliesTo.products.some(
      id => String(id) === String(product._id)
    );
    if (productMatch) return true;

    // Check category match
    const categoryMatch = appliesTo.category && String(appliesTo.category) === String(categoryId);
    if (categoryMatch) return true;

    // Check brand match
    const brandMatch = appliesTo.brand && String(appliesTo.brand) === String(brandId);
    if (brandMatch) return true;

    return false;
  }) || null;
};

// ── Controllers ────────────────────────────────────────────────

/**
 * 📦 Get All Products (with Search & Advanced Filter)
 */
exports.getProducts = async (req, res) => {
  try {
    const { 
      category, 
      brand, 
      size, 
      search, 
      segment,
      minPrice,
      maxPrice,
      page = 1, 
      limit = 24 
    } = req.query;

    const filter = { isDeleted: false, isVisible: { $ne: false } };

    // 1. Text Search Optimization
    if (search) {
      const normalized = toEnglishDigits(search);
      filter.$text = { $search: normalized };
    }

    // 2. Multi-Category Filter — BUG-034 fix: run in parallel with brand lookup
    let categoryIds, brandIds;
    [categoryIds, brandIds] = await Promise.all([
      category
        ? Category.find({ slug: { $in: category.split(',') } }).select('_id').lean().then(r => r.map(c => c._id))
        : Promise.resolve(null),
      brand
        ? Brand.find({ slug: { $in: brand.split(',') } }).select('_id').lean().then(r => r.map(b => b._id))
        : Promise.resolve(null),
    ]);

    if (categoryIds) filter.category = { $in: categoryIds };
    if (brandIds)    filter.brand    = { $in: brandIds };

    // 4. Specific Spec Filters
    if (size)    filter['commonSpecs.size'] = { $regex: size, $options: 'i' };
    if (segment) filter.segment = segment;

    // 5. Price Range Filter — BUG-033 fix: was querying non-existent 'basePrice' field.
    // Prices live in variants[].pricing.retail. Use $elemMatch to filter correctly.
    if (minPrice || maxPrice) {
      const priceCondition = {};
      if (minPrice) priceCondition.$gte = parseFloat(minPrice);
      if (maxPrice) priceCondition.$lte = parseFloat(maxPrice);
      filter.variants = {
        $elemMatch: { 'pricing.retail': priceCondition }
      };
    }

    const skip  = (page - 1) * limit;
    
    // Execute Query
    let query = Product.find(filter)
      .populate('brand', 'name logo slug')
      .populate('category', 'name slug')
      .select('-__v')
      .skip(skip)
      .limit(parseInt(limit));

    // If text search, sort by relevance score
    if (search) {
      query = query.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const [products, total] = await Promise.all([
      query.lean(),
      Product.countDocuments(filter)
    ]);

    // Silent search term logging (fire-and-forget)
    if (search) logSearchTerm(search, total);

    // Apply Pricing & Campaigns
    const role       = req.user?.role || 'customer';
    const multiplier = req.user?.discountMultiplier || 1.0;

    const activeCampaigns = await getActiveCampaigns();

    const isDealer = req.user?.role === 'dealer';
    const dealerTier = req.user?.tier || 'standard';
    const discountMap = { standard: 0, silver: 5, gold: 10, platinum: 15 };

    const data = await Promise.all(products.map(async (p) => {
      const campaign = matchActiveCampaign(p, activeCampaigns);
      const processedVariants = PricingService.processVariants(p.variants, { 
        role, 
        multiplier, 
        campaign 
      });

      let tierPrice;
      if (isDealer) {
        const publicPrice   = p.variants?.[0]?.pricing?.wholesale ?? 0;
        const adjustedPrice = await TierPricingService.getDealerPrice(publicPrice, dealerTier);
        tierPrice = {
          tier:            dealerTier,
          discountPercent: discountMap[dealerTier] ?? 0,
          adjustedPrice,
        };
      }

      return {
        ...p,
        variants: processedVariants,
        campaign: campaign ? { name: campaign.name, badgeText: campaign.badgeText } : null,
        ...(tierPrice ? { tierPrice } : {}),
      };
    }));

    sendSuccess(res, 200, 'Products fetched.', { 
      total, 
      page: +page, 
      limit: +limit, 
      products: data 
    });
  } catch (err) {
    console.error('❌ Error in getProducts:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * 🔍 Get Single Product by Slug
 */
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isDeleted: false, isVisible: { $ne: false } })
      .populate('brand',            'name logo slug origin description')
      .populate('category',         'name slug')
      .populate('relatedProducts',  'name slug media variants')
      .lean();

    if (!product) return sendError(res, 404, 'Product not found.');

    // Fire & Forget View Count Update
    Product.findByIdAndUpdate(product._id, { $inc: { 'meta.views': 1 } }).exec();

    const role       = req.user?.role || 'customer';
    const multiplier = req.user?.discountMultiplier || 1.0;
    
    const activeCampaigns = await getActiveCampaigns();
    const campaign   = matchActiveCampaign(product, activeCampaigns);

    const processedVariants = PricingService.processVariants(product.variants, { 
      role, 
      multiplier, 
      campaign 
    });

    // Compute tier price for dealers (Req 4.3)
    let tierPrice;
    if (req.user?.role === 'dealer') {
      const publicPrice = product.variants?.[0]?.pricing?.wholesale ?? 0;
      const dealerTier  = req.user.tier || 'standard';
      const adjustedPrice = await TierPricingService.getDealerPrice(publicPrice, dealerTier);
      // Get discountPercent from cache (getDealerPrice populates cache as side-effect)
      // Re-read from cache or use the TierPricingRule directly via a 2nd lookup — use the simple approach:
      const discountMap = { standard: 0, silver: 5, gold: 10, platinum: 15 };
      tierPrice = {
        tier:           dealerTier,
        discountPercent: discountMap[dealerTier] ?? 0,
        adjustedPrice,
      };
    }

    sendSuccess(res, 200, 'Product fetched.', {
      ...product,
      variants: processedVariants,
      campaign: campaign ? { name: campaign.name, badgeText: campaign.badgeText } : null,
      ...(tierPrice ? { tierPrice } : {}),
    });
  } catch (err) {
    console.error('❌ Error in getProduct:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * 📁 Get Hierarchical Category Tree
 */
exports.getCategories = async (req, res) => {
  try {
    // 1. Fetch only active categories
    const allCategories = await Category.find({ isActive: { $ne: false } }).sort({ order: 1, name: 1 }).lean();

    // 2. Get product counts per category (Aggregation)
    const counts = await Product.aggregate([
      { $match: { isDeleted: false, isVisible: { $ne: false } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // 3. Map counts to category objects and FILTER OUT EMPTY ONES
    const countMap = counts.reduce((acc, curr) => {
      acc[String(curr._id)] = curr.count;
      return acc;
    }, {});

    const catsWithCounts = allCategories
      .map(cat => ({
        ...cat,
        productCount: countMap[String(cat._id)] || 0
      }))
      .filter(cat => cat.productCount > 0); // Industry Standard: Hide empty categories

    // 4. Check if pricing is globally visible (at least one visible product has showPrice: true)
    const showPriceProduct = await Product.findOne({ isDeleted: false, isVisible: true, showPrice: true }).select('_id').lean();
    const isPricingVisible = !!showPriceProduct;

    const tree = buildCategoryTree(catsWithCounts, null);
    sendSuccess(res, 200, 'Categories tree fetched.', { 
      categories: tree, 
      config: { isPricingVisible } 
    });
  } catch (err) {
    console.error('❌ Error in getCategories:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * 🔍 Live Search / Suggestions API
 */
exports.getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return sendSuccess(res, 200, 'Query too short.', []);

    // Search in name, sku, size, and searchTags
    const normalizedQ = toEnglishDigits(q);
    const suggestions = await Product.find({
      isDeleted: false,
      isVisible: { $ne: false },
      $or: [
        { name: { $regex: normalizedQ, $options: 'i' } },
        { sku:  { $regex: normalizedQ, $options: 'i' } },
        { 'commonSpecs.size': { $regex: normalizedQ, $options: 'i' } },
        { searchTags: { $regex: normalizedQ, $options: 'i' } }
      ]
    })
    .select('name slug sku media category')
    .populate('category', 'slug')
    .limit(10)
    .lean();

    // Silent logging for suggestion searches
    logSearchTerm(q, suggestions.length);

    sendSuccess(res, 200, 'Suggestions fetched.', suggestions);
  } catch (err) {
    console.error('❌ Error in getSuggestions:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * 🏷️ Get All Active Brands
 */
exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 }).lean();
    sendSuccess(res, 200, 'Brands fetched.', brands);
  } catch (err) {
    console.error('❌ Error in getBrands:', err);
    sendError(res, 500, err.message);
  }
};
