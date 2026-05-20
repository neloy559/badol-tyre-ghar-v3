const Banner = require('../marketing/banner.model');
const SiteConfig = require('../ops/siteConfig.model');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

/**
 * 🚩 Banner Management
 */
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ order: 1 }).lean();
    sendSuccess(res, 200, 'Banners fetched.', banners);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.createBanner = async (req, res) => {
  try {
    const banner = await Banner.create(req.body);
    sendSuccess(res, 201, 'Banner created.', banner);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    sendSuccess(res, 200, 'Banner updated.', banner);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    sendSuccess(res, 200, 'Banner deleted.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * ⚙️ Site Config Management
 */
exports.getConfig = async (req, res) => {
  try {
    const config = await SiteConfig.findOne({ key: 'main_config' }) || {};
    sendSuccess(res, 200, 'Config fetched.', config);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.updateConfig = async (req, res) => {
  try {
    const config = await SiteConfig.findOneAndUpdate(
      { key: 'main_config' },
      { $set: req.body },
      { upsert: true, new: true }
    );
    sendSuccess(res, 200, 'Config updated.', config);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
