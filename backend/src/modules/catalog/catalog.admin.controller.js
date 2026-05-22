const Product = require('./models/Product');
const Brand = require('./models/Brand');
const Category = require('./models/Category');
const { AuditLog } = require('../ops/models');
const { sendSuccess, sendError } = require('../../utils/sendResponse');
const { generateProductTags } = require('../../utils/searchHelper');

// ── Audit Helper ───────────────────────────────────────────────
const audit = (adminId, action, targetId, oldValue, newValue) =>
  AuditLog.create({ adminId, action, targetId, details: { oldValue, newValue } });

// ── Controllers ────────────────────────────────────────────────

/**
 * 🛠️ Admin: Get ALL products (raw, unprocessed — for catalog management UI)
 * Returns pricing.retail / pricing.wholesale intact (not PricingService-processed)
 */
exports.getAdminProducts = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50, category = '' } = req.query;
    const filter = { isDeleted: false };
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { sku:   { $regex: search, $options: 'i' } },
      ];
    }
    // Filter by category slug if provided
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category }).lean();
      if (categoryDoc) filter.category = categoryDoc._id;
      else return sendSuccess(res, 200, 'Admin products fetched.', { total: 0, page: +page, limit: +limit, products: [] });
    }
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('brand',    'name logo slug')
        .populate('category', 'name slug')
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);
    sendSuccess(res, 200, 'Admin products fetched.', { total, page: +page, limit: +limit, products });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * ⚡ Bulk Toggle isVisible or showPrice
 * PATCH /admin/catalog/products/bulk-toggle
 * Body: { field: 'isVisible' | 'showPrice', value: boolean, category: 'slug' | 'all' }
 */
exports.bulkToggleProductField = async (req, res) => {
  try {
    const { field, value, category } = req.body;
    const allowed = ['isVisible', 'showPrice'];
    if (!allowed.includes(field)) return sendError(res, 400, `Field must be one of: ${allowed.join(', ')}`);
    
    const filter = { isDeleted: false };
    if (category && category !== 'all') {
      const categoryDoc = await Category.findOne({ slug: category }).lean();
      if (!categoryDoc) return sendError(res, 404, 'Category not found.');
      filter.category = categoryDoc._id;
    }

    const result = await Product.updateMany(filter, { [field]: value });
    sendSuccess(res, 200, `Bulk ${field} updated successfully. Modified ${result.modifiedCount} products.`);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};


/**
 * ⚡ Toggle isVisible or showPrice on a product instantly
 * PATCH /admin/catalog/products/:id/toggle
 * Body: { field: 'isVisible' | 'showPrice', value: boolean }
 */
exports.toggleProductField = async (req, res) => {
  try {
    const { field, value } = req.body;
    const allowed = ['isVisible', 'showPrice'];
    if (!allowed.includes(field)) return sendError(res, 400, `Field must be one of: ${allowed.join(', ')}`);
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { [field]: value },
      { new: true }
    ).lean();
    if (!product) return sendError(res, 404, 'Product not found.');
    sendSuccess(res, 200, `${field} updated.`, { _id: product._id, [field]: product[field] });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { brand, category, customTags } = req.body;
    let brandName = '';
    let categoryName = '';
    if (brand) {
      const brandDoc = await Brand.findById(brand).lean();
      if (brandDoc) brandName = brandDoc.name;
    }
    if (category) {
      const catDoc = await Category.findById(category).lean();
      if (catDoc) categoryName = catDoc.name;
    }

    let customTagsParsed = [];
    if (customTags) {
      customTagsParsed = typeof customTags === 'string'
        ? customTags.split(',').map(t => t.trim()).filter(Boolean)
        : customTags;
    }

    req.body.customTags = customTagsParsed;
    req.body.searchTags = generateProductTags(req.body, brandName, categoryName, customTagsParsed);

    const product = await Product.create(req.body);
    await audit(req.user._id, 'CREATE_PRODUCT', product._id, null, req.body);
    sendSuccess(res, 201, 'Product created.', product);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const old = await Product.findById(req.params.id).lean();
    if (!old) return sendError(res, 404, 'Product not found.');

    const { name, sku, brand, category, media, commonSpecs, variants, customTags } = req.body;

    // Resolve category: may arrive as a slug string (from frontend form) or ObjectId string
    let categoryId = old.category; // fallback to existing
    if (category) {
      const isObjectId = /^[a-f\d]{24}$/i.test(String(category));
      if (isObjectId) {
        categoryId = category;
      } else {
        // Treat as slug — look up the Category document
        const catDoc = await Category.findOne({ slug: category }).lean();
        if (catDoc) categoryId = catDoc._id;
        // If not found, keep existing — don't corrupt the record
      }
    }

    // Brand: frontend sends ObjectId directly
    const brandId = brand || old.brand;

    let brandName = '';
    let categoryName = '';
    if (brandId) {
      const brandDoc = await Brand.findById(brandId).lean();
      if (brandDoc) brandName = brandDoc.name;
    }
    if (categoryId) {
      const catDoc = await Category.findById(categoryId).lean();
      if (catDoc) categoryName = catDoc.name;
    }

    let customTagsParsed = [];
    if (customTags !== undefined) {
      customTagsParsed = typeof customTags === 'string'
        ? customTags.split(',').map(t => t.trim()).filter(Boolean)
        : customTags;
    } else {
      customTagsParsed = old.customTags || [];
    }

    const mergedProduct = {
      name: name || old.name,
      sku: sku || old.sku,
      commonSpecs: commonSpecs || old.commonSpecs,
    };

    const updatePayload = {};
    if (name)        updatePayload.name        = name;
    if (sku)         updatePayload.sku         = sku;
    if (brandId)     updatePayload.brand       = brandId;
    if (categoryId)  updatePayload.category    = categoryId;
    if (media)       updatePayload.media       = media;
    if (commonSpecs) updatePayload.commonSpecs = commonSpecs;
    if (variants)    updatePayload.variants    = variants;

    updatePayload.customTags = customTagsParsed;
    updatePayload.searchTags = generateProductTags(mergedProduct, brandName, categoryName, customTagsParsed);

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    await audit(req.user._id, 'UPDATE_PRODUCT', updated._id, old, updatePayload);
    sendSuccess(res, 200, 'Product updated.', updated);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

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

exports.bulkUploadProducts = async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0)
      return sendError(res, 400, 'No products provided.');

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

      // Auto-generate search tags for bulk upload
      const generatedTags = generateProductTags(
        { name: row.name, sku: row.sku, commonSpecs: { size: row.size || '', pattern: row.pattern || '' } },
        row.brand || '',
        row.category || '',
        []
      );

      const setFields = {
        name:                  row.name,
        'commonSpecs.size':    row.size    || '',
        'commonSpecs.pattern': row.pattern || '',
        variants:              row.variants,
        searchTags:            generatedTags,
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

exports.bulkMarkup = async (req, res) => {
  try {
    const { filter = {}, type, value, priceField = 'retail' } = req.body;
    if (!type || value === undefined) return sendError(res, 400, 'type and value required.');

    const dbFilter = { isDeleted: false };
    if (filter.brand)    dbFilter.brand    = filter.brand;
    if (filter.category) dbFilter.category = filter.category;

    // BUG-038 fix: was using sequential for-loop with p.save() — times out on Vercel
    // for large catalogs. Now uses bulkWrite for a single DB round-trip.
    const products = await Product.find(dbFilter).select('_id variants').lean();
    if (products.length === 0) {
      return sendSuccess(res, 200, 'No products matched the filter.', { updatedCount: 0 });
    }

    const ops = products.map((p) => {
      const updatedVariants = p.variants.map((v) => {
        const base = v.pricing?.[priceField] || 0;
        const newPrice = type === 'percentage'
          ? Math.round(base + (base * value / 100))
          : Math.round(base + value);
        return {
          ...v,
          pricing: {
            ...v.pricing,
            [priceField]: Math.max(0, newPrice),
          },
        };
      });
      return {
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { variants: updatedVariants } },
        },
      };
    });

    const result = await Product.bulkWrite(ops, { ordered: false });
    const updatedCount = result.modifiedCount;

    await audit(req.user._id, 'BULK_MARKUP', null, filter, { type, value, priceField, updatedCount });
    sendSuccess(res, 200, `Bulk markup applied to ${updatedCount} products.`, { updatedCount });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

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
exports.syncMigrationResults = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(__dirname, '../../../migration_results.json');
    
    if (!fs.existsSync(resultsPath)) return sendError(res, 404, 'Migration results file not found.');
    
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    let updated = 0;

    for (const record of results) {
      if (record.status === 'success' && record.newUrl) {
        const result = await Product.updateOne(
          { sku: record.sku },
          { $set: { media: [record.newUrl] } }
        );
        if (result.modifiedCount > 0) updated++;
      }
    }

    sendSuccess(res, 200, `Sync complete. ${updated} products updated.`, { updated });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
