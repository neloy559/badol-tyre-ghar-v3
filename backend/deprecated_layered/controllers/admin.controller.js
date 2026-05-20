const { User, Product, InquiryCart, Campaign, AuditLog, Brand, Category } = require('../models');
const { sendSuccess, sendError } = require('../utils/sendResponse');

// ── Audit Helper ───────────────────────────────────────────────
const audit = (adminId, action, targetId, oldValue, newValue) =>
  AuditLog.create({ adminId, action, targetId, details: { oldValue, newValue } });

// ══════════════════════════════════════════════
// DEALER VERIFICATION QUEUE
// ══════════════════════════════════════════════

// GET /api/v1/admin/dealers/pending
exports.getPendingDealers = async (req, res) => {
  try {
    const dealers = await User.find({
      role: { $in: ['dealer', 'sales_partner'] },
      isVerified: false,
      isDeleted: false,
      'verificationDetails.appliedAt': { $exists: true },
    }).select('-password').lean();
    sendSuccess(res, 200, 'Pending dealers fetched.', dealers);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// PATCH /api/v1/admin/dealers/:id/verify
exports.verifyDealer = async (req, res) => {
  try {
    const { approve } = req.body; // true = approve, false = reject
    const dealer = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const oldVerified = dealer.isVerified;
    dealer.isVerified = !!approve;
    await dealer.save();

    await audit(req.user._id, approve ? 'VERIFY_DEALER' : 'REJECT_DEALER', dealer._id, oldVerified, dealer.isVerified);
    sendSuccess(res, 200, `Dealer ${approve ? 'approved' : 'rejected'}.`);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// PATCH /api/v1/admin/dealers/:id/discount
exports.setDealerDiscount = async (req, res) => {
  try {
    const { multiplier, creditLimit, paymentTerms } = req.body;
    const dealer = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const old = { multiplier: dealer.discountMultiplier, creditLimit: dealer.creditLimit };
    if (multiplier    !== undefined) dealer.discountMultiplier = multiplier;
    if (creditLimit   !== undefined) dealer.creditLimit        = creditLimit;
    if (paymentTerms  !== undefined) dealer.paymentTerms       = paymentTerms;
    await dealer.save();

    await audit(req.user._id, 'UPDATE_DEALER_TERMS', dealer._id, old, { multiplier, creditLimit, paymentTerms });
    sendSuccess(res, 200, 'Dealer terms updated.', dealer);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// ══════════════════════════════════════════════
// PRODUCT MANAGEMENT
// ══════════════════════════════════════════════

// POST /api/v1/admin/products
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await audit(req.user._id, 'CREATE_PRODUCT', product._id, null, req.body);
    sendSuccess(res, 201, 'Product created.', product);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// PATCH /api/v1/admin/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const old     = await Product.findById(req.params.id).lean();
    if (!old) return sendError(res, 404, 'Product not found.');

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await audit(req.user._id, 'UPDATE_PRODUCT', updated._id, old, req.body);
    sendSuccess(res, 200, 'Product updated.', updated);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// DELETE /api/v1/admin/products/:id  (Soft Delete)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 404, 'Product not found.');

    product.isDeleted = true;
    await product.save();
    await audit(req.user._id, 'SOFT_DELETE_PRODUCT', product._id, false, true);
    sendSuccess(res, 200, 'Product archived (soft deleted).');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// POST /api/v1/admin/products/bulk-upload
// body: { products: [ { name, sku, brand, category, size, pattern, ply, designModel, retailPrice, wholesalePrice, stock } ] }
exports.bulkUploadProducts = async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0)
      return sendError(res, 400, 'No products provided.');

    // BUG FIX #2: Resolve brand/category name strings -> ObjectIds
    // The CSV has human-readable names (e.g. "Hussain", "Tubes"). We must
    // look them up (or create them) to get the actual MongoDB ObjectId.
    const brandCache    = {};
    const categoryCache = {};

    const resolveBrand = async (name) => {
      if (!name) return undefined;
      if (brandCache[name]) return brandCache[name];
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const doc  = await Brand.findOneAndUpdate(
        { slug },
        { $setOnInsert: { name, slug } },
        { upsert: true, new: true, lean: true }
      );
      brandCache[name] = doc._id;
      return doc._id;
    };

    const resolveCategory = async (name) => {
      if (!name) return undefined;
      if (categoryCache[name]) return categoryCache[name];
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const doc  = await Category.findOneAndUpdate(
        { slug },
        { $setOnInsert: { name, slug } },
        { upsert: true, new: true, lean: true }
      );
      categoryCache[name] = doc._id;
      return doc._id;
    };

    // Group by SKU first to handle multi-variant rows for the same product in one go
    const groupedBySku = {};
    for (const row of products) {
      if (!row.sku) continue;
      if (!groupedBySku[row.sku]) groupedBySku[row.sku] = { ...row, variants: [] };
      groupedBySku[row.sku].variants.push({
        sku:         `${row.sku}-${row.ply || 'STD'}-${row.designModel || 'DEF'}`,
        ply:         row.ply        || '',
        designModel: row.designModel || '',
        pricing: {
          retail:    Number(row.retailPrice)    || 0,
          wholesale: Number(row.wholesalePrice) || 0,
        },
        inventory: { stock: Number(row.stock) || 0 },
      });
    }

    const ops = await Promise.all(Object.values(groupedBySku).map(async (row) => {
      const brandId    = await resolveBrand(row.brand);
      const categoryId = await resolveCategory(row.category);

      const setFields = {
        name:                  row.name,
        'commonSpecs.size':    row.size    || '',
        'commonSpecs.pattern': row.pattern || '',
        variants:              row.variants, // Replace variants array to prevent duplicates
      };
      if (row.image)    setFields.media    = [row.image];
      if (brandId)      setFields.brand    = brandId;
      if (categoryId)   setFields.category = categoryId;

      return {
        updateOne: {
          filter: { sku: row.sku },
          update: {
            $set: setFields,
            $setOnInsert: { sku: row.sku, slug: row.sku?.toString().toLowerCase().replace(/\s+/g, '-') },
          },
          upsert: true,
        },
      };
    }));

    const result = await Product.bulkWrite(ops, { ordered: false });
    await audit(req.user._id, 'BULK_UPLOAD_PRODUCTS', null, null, {
      inserted: result.upsertedCount,
      updated:  result.modifiedCount,
    });
    sendSuccess(res, 200, `Bulk upload complete.`, {
      inserted: result.upsertedCount,
      updated:  result.modifiedCount,
      total:    products.length,
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};



// POST /api/v1/admin/products/bulk-markup
// body: { filter: { brand?, category? }, type: 'percentage'|'fixed', value: Number, priceField: 'retail'|'wholesale' }
exports.bulkMarkup = async (req, res) => {
  try {
    const { filter = {}, type, value, priceField = 'retail' } = req.body;
    if (!type || value === undefined) return sendError(res, 400, 'type and value required.');

    const dbFilter = { isDeleted: false };
    if (filter.brand)    dbFilter.brand    = filter.brand;
    if (filter.category) dbFilter.category = filter.category;

    const products = await Product.find(dbFilter);
    let updatedCount = 0;

    for (const p of products) {
      p.variants = p.variants.map((v) => {
        const base = v.pricing[priceField] || 0;
        const newPrice = type === 'percentage'
          ? Math.round(base + (base * value / 100))
          : Math.round(base + value);
        v.pricing[priceField] = Math.max(0, newPrice);
        return v;
      });
      await p.save();
      updatedCount++;
    }

    await audit(req.user._id, 'BULK_MARKUP', null, filter, { type, value, priceField, updatedCount });
    sendSuccess(res, 200, `Bulk markup applied to ${updatedCount} products.`, { updatedCount });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// ══════════════════════════════════════════════
// CAMPAIGN MANAGER
// ══════════════════════════════════════════════

// POST /api/v1/admin/campaigns
exports.createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body);
    await audit(req.user._id, 'CREATE_CAMPAIGN', campaign._id, null, req.body);
    sendSuccess(res, 201, 'Campaign created.', campaign);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// GET /api/v1/admin/campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    sendSuccess(res, 200, 'Campaigns fetched.', campaigns);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// PATCH /api/v1/admin/campaigns/:id
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!campaign) return sendError(res, 404, 'Campaign not found.');
    await audit(req.user._id, 'UPDATE_CAMPAIGN', campaign._id, null, req.body);
    sendSuccess(res, 200, 'Campaign updated.', campaign);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// ══════════════════════════════════════════════
// INQUIRY CRM
// ══════════════════════════════════════════════

// GET /api/v1/admin/inquiries
exports.getInquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const inquiries = await InquiryCart.find(filter)
      .populate('userId', 'phone profile.name profile.shopName role')
      .populate('items.productId', 'name sku')
      .sort({ updatedAt: -1 })
      .lean();
    sendSuccess(res, 200, 'Inquiries fetched.', inquiries);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// PATCH /api/v1/admin/inquiries/:id/status
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status, saleAmount } = req.body;
    const validStatuses = ['inquired', 'replied', 'converted_to_sale', 'closed'];
    if (!validStatuses.includes(status)) return sendError(res, 400, 'Invalid status.');

    const cart = await InquiryCart.findById(req.params.id);
    if (!cart) return sendError(res, 404, 'Inquiry not found.');

    const old = cart.status;
    cart.status = status;
    if (status === 'converted_to_sale' && saleAmount) {
      cart.saleDetails = { amount: saleAmount, date: new Date() };
    }
    await cart.save();

    await audit(req.user._id, 'UPDATE_INQUIRY_STATUS', cart._id, old, status);
    sendSuccess(res, 200, 'Inquiry status updated.', cart);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// ══════════════════════════════════════════════
// DATA EXPORT (CSV Backup)
// ══════════════════════════════════════════════

// GET /api/v1/admin/export/products
exports.exportProducts = async (req, res) => {
  try {
    const products = await Product.find({ isDeleted: false })
      .populate('brand', 'name')
      .populate('category', 'name')
      .lean();

    const rows = [];
    for (const p of products) {
      for (const v of p.variants) {
        rows.push({
          sku:          v.sku || p.sku,
          name:         p.name,
          brand:        p.brand?.name || '',
          category:     p.category?.name || '',
          size:         p.commonSpecs?.size || '',
          pattern:      p.commonSpecs?.pattern || '',
          ply:          v.ply || '',
          designModel:  v.designModel || '',
          retailPrice:  v.pricing.retail,
          wholesalePrice: v.pricing.wholesale,
          stock:        v.inventory.stock,
        });
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=btg_products.csv');

    const header = Object.keys(rows[0] || {}).join(',');
    const csvRows = rows.map((r) => 
      Object.values(r).map(v => `"${v?.toString().replace(/"/g, '""') || ''}"`).join(',')
    );
    res.send([header, ...csvRows].join('\n'));
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
