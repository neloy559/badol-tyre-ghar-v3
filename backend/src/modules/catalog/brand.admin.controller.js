const Brand   = require('./models/Brand');
const Product = require('./models/Product');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
}

/** GET /admin/brands — all brands (including inactive) */
exports.getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 }).lean();
    // Attach product count to each brand
    const withCounts = await Promise.all(brands.map(async (b) => {
      const count = await Product.countDocuments({ brand: b._id, isDeleted: false });
      return { ...b, productCount: count };
    }));
    sendSuccess(res, 200, 'Brands fetched.', withCounts);
  } catch (err) { sendError(res, 500, err.message); }
};

/** POST /admin/brands — create new brand */
exports.createBrand = async (req, res) => {
  try {
    const { name, categories = [], origin = '', description = '' } = req.body;
    if (!name?.trim()) return sendError(res, 400, 'Brand name is required.');
    const slug = slugify(name);
    const existing = await Brand.findOne({ $or: [{ name: name.trim() }, { slug }] });
    if (existing) return sendError(res, 409, `Brand "${name}" already exists.`);
    const brand = await Brand.create({ name: name.trim(), slug, categories, origin, description, isActive: true });
    sendSuccess(res, 201, 'Brand created.', brand);
  } catch (err) { sendError(res, 500, err.message); }
};

/** PATCH /admin/brands/:id — update name, categories, origin */
exports.updateBrand = async (req, res) => {
  try {
    const { name, categories, origin, description } = req.body;
    const brand = await Brand.findById(req.params.id);
    if (!brand) return sendError(res, 404, 'Brand not found.');
    if (name) { brand.name = name.trim(); brand.slug = slugify(name); }
    if (categories !== undefined) brand.categories = categories;
    if (origin     !== undefined) brand.origin      = origin;
    if (description!== undefined) brand.description = description;
    await brand.save();
    sendSuccess(res, 200, 'Brand updated.', brand);
  } catch (err) { sendError(res, 500, err.message); }
};

/** PATCH /admin/brands/:id/toggle — toggle isActive */
exports.toggleBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return sendError(res, 404, 'Brand not found.');
    brand.isActive = !brand.isActive;
    await brand.save();
    sendSuccess(res, 200, `Brand ${brand.isActive ? 'activated' : 'hidden'}.`, { _id: brand._id, isActive: brand.isActive });
  } catch (err) { sendError(res, 500, err.message); }
};

/** DELETE /admin/brands/:id — hard delete only if 0 products linked */
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return sendError(res, 404, 'Brand not found.');
    const count = await Product.countDocuments({ brand: brand._id, isDeleted: false });
    if (count > 0) return sendError(res, 409, `Cannot delete "${brand.name}" — it has ${count} active product(s). Hide it instead.`);
    await Brand.deleteOne({ _id: brand._id });
    sendSuccess(res, 200, `Brand "${brand.name}" deleted.`);
  } catch (err) { sendError(res, 500, err.message); }
};
