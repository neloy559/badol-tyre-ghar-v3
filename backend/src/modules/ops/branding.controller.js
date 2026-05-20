const Banner = require('../marketing/banner.model');
const SiteConfig = require('../ops/siteConfig.model');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

/**
 * 🎨 Get Public Branding Data (Logo, Banners, Config)
 */
exports.getBranding = async (req, res) => {
  try {
    const [banners, config] = await Promise.all([
      Banner.find({ isActive: true }).sort({ order: 1 }).lean(),
      SiteConfig.findOne({ key: 'main_config' }).lean()
    ]);

    sendSuccess(res, 200, 'Branding fetched.', {
      banners,
      config: config || { branding: { name: 'Badol Tyre Ghar' } }
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
