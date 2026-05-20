const { Product, Campaign, Category, Brand } = require('../models');
const { sendSuccess, sendError } = require('../utils/sendResponse');

// ── Helpers ────────────────────────────────────────────────────

const getStockLabel = (stock) => {
  if (stock <= 0)  return 'out_of_stock';
  if (stock <= 20) return 'limited';
  return 'in_stock';
};

// Apply active campaign discount to a price
const applyDiscount = (price, campaign) => {
  if (!campaign) return { finalPrice: price, original: null };
  const discounted = campaign.type === 'percentage'
    ? price - (price * campaign.value / 100)
    : price - campaign.value;
  return { finalPrice: Math.max(0, Math.round(discounted)), original: price };
};

// Role-based pricing picker
const getPricing = (variants, userRole, multiplier = 1.0) => {
  return variants.map((v) => {
    const base = (userRole === 'dealer' || userRole === 'sales_partner')
      ? Math.round(v.pricing.wholesale * multiplier)
      : v.pricing.retail;
    return {
      sku:         v.sku,
      ply:         v.ply,
      designModel: v.designModel,
      price:       base,
      stock:       v.inventory.stock,
      stockLabel:  getStockLabel(v.inventory.stock),
    };
  });
};

// Fetch active campaign that applies to this product
// BUG FIX #3: product.category and product.brand are populated objects after .populate().
// Mongoose cannot match an object against an ObjectId field, so we extract ._id explicitly.
const getActiveCampaign = async (product) => {
  const now = new Date();
  const categoryId = product.category?._id || product.category;
  const brandId    = product.brand?._id    || product.brand;
  
  // Sort by value desc to ensure user gets the best discount if campaigns overlap
  return Campaign.findOne({
    isActive: true,
    startDate: { $lte: now },
    endDate:   { $gte: now },
    $or: [
      { 'appliesTo.products': product._id },
      { 'appliesTo.category': categoryId },
      { 'appliesTo.brand':    brandId },
    ],
  }).sort({ value: -1 });
};

// ── Controllers ────────────────────────────────────────────────

// GET /api/v1/products?category=&brand=&size=&search=&page=&limit=
exports.getProducts = async (req, res) => {
  try {
    const { category, brand, size, search, page = 1, limit = 24 } = req.query;
    const filter = { isDeleted: false };

    // BUG FIX #1: Resolve slug → ObjectId before filtering
    // category and brand query params are slugs (strings), not ObjectIds
    if (category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat) filter.category = cat._id;
      else filter.category = null; // no results if slug not found
    }
    if (brand) {
      const br = await Brand.findOne({ slug: brand }).lean();
      if (br) filter.brand = br._id;
      else filter.brand = null;
    }
    if (size)   filter['commonSpecs.size'] = { $regex: size, $options: 'i' };
    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { 'commonSpecs.size': { $regex: search, $options: 'i' } },
    ];

    const skip  = (page - 1) * limit;
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('brand', 'name logo slug')
      .populate('category', 'name slug')
      .select('-__v')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const role       = req.user?.role || 'customer';
    const multiplier = req.user?.discountMultiplier || 1.0;

    const data = await Promise.all(products.map(async (p) => {
      const campaign = await getActiveCampaign(p);
      const variants = getPricing(p.variants, role, multiplier).map((v) => {
        const { finalPrice, original } = applyDiscount(v.price, campaign);
        return { ...v, price: finalPrice, originalPrice: original };
      });

      return {
        _id:         p._id,
        name:        p.name,
        slug:        p.slug,
        brand:       p.brand,
        category:    p.category,
        media:       p.media,
        segment:     p.segment,
        packingSize: p.packingSize,
        commonSpecs: p.commonSpecs,
        variants,
        campaign: campaign ? { name: campaign.name, badgeText: campaign.badgeText } : null,
        meta:        p.meta,
      };
    }));

    sendSuccess(res, 200, 'Products fetched.', { total, page: +page, limit: +limit, products: data });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// GET /api/v1/products/:slug
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isDeleted: false })
      .populate('brand',            'name logo slug origin description')
      .populate('category',         'name slug')
      .populate('relatedProducts',  'name slug media variants')
      .lean();

    if (!product) return sendError(res, 404, 'Product not found.');

    // Increment view count silently
    Product.findByIdAndUpdate(product._id, { $inc: { 'meta.views': 1 } }).exec();

    const role       = req.user?.role || 'customer';
    const multiplier = req.user?.discountMultiplier || 1.0;
    const campaign   = await getActiveCampaign(product);

    const variants = getPricing(product.variants, role, multiplier).map((v) => {
      const { finalPrice, original } = applyDiscount(v.price, campaign);
      return { ...v, price: finalPrice, originalPrice: original };
    });

    sendSuccess(res, 200, 'Product fetched.', {
      ...product,
      variants,
      campaign: campaign ? { name: campaign.name, badgeText: campaign.badgeText } : null,
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
