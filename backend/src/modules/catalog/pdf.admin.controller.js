const crypto        = require('crypto');
const PdfManifest   = require('./models/PdfManifest');
const PdfDownloadLog = require('./models/PdfDownloadLog');
const Product       = require('./models/Product');
const Category      = require('./models/Category');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

const CATEGORY_LABELS = {
  'tubes':         'Tubes',
  'tyres':         'Tyres',
  'tyre-sealants': 'Tyre Sealants',
  'patches':       'Patches',
  'flaps':         'Flaps',
  'gadgets':       'Gadgets',
  'all':           'All Products',
};

/**
 * Compute a version hash for a set of products.
 * Hash changes when: any product is added/removed/price changed/visibility changed.
 */
const computeVersionHash = (products) => {
  const payload = products.map(p => ({
    id: String(p._id),
    price: p.variants?.[0]?.pricing?.retail || p.variants?.[0]?.price || 0,
    updated: p.updatedAt,
    visible: p.isVisible,
  }));
  return crypto
    .createHash('md5')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 12); // short hash, e.g. "a3f9c2b1d4e7"
};

/**
 * GET /admin/pdf/manifest
 * Returns all PDF manifest entries — used by Admin UI to show status.
 */
exports.getManifest = async (req, res) => {
  try {
    const manifests = await PdfManifest.find({}).sort({ categorySlug: 1 }).lean();

    // Ensure all categories have a manifest entry
    const allSlugs = [...Object.keys(CATEGORY_LABELS)];
    const existingSlugs = manifests.map(m => m.categorySlug);
    const missing = allSlugs.filter(s => !existingSlugs.includes(s));

    if (missing.length > 0) {
      await PdfManifest.insertMany(
        missing.map(slug => ({
          categorySlug: slug,
          categoryLabel: CATEGORY_LABELS[slug],
          status: 'pending',
        }))
      );
      return exports.getManifest(req, res); // re-fetch after insert
    }

    sendSuccess(res, 200, 'PDF manifest fetched.', manifests);
  } catch (err) {
    console.error('❌ getManifest:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * POST /admin/pdf/mark-ready
 * Called by frontend after it generates and uploads a PDF to Cloudinary.
 * Body: { categorySlug, pdfUrl, productCount, versionHash }
 */
exports.markReady = async (req, res) => {
  try {
    const { categorySlug, pdfUrl, productCount, versionHash } = req.body;

    if (!categorySlug || !pdfUrl || !versionHash) {
      return sendError(res, 400, 'categorySlug, pdfUrl, and versionHash are required.');
    }

    const manifest = await PdfManifest.findOneAndUpdate(
      { categorySlug },
      {
        pdfUrl,
        versionHash,
        productCount: productCount || 0,
        generatedAt: new Date(),
        status: 'ready',
        error: null,
        categoryLabel: CATEGORY_LABELS[categorySlug] || categorySlug,
      },
      { upsert: true, new: true }
    );

    sendSuccess(res, 200, `PDF for "${categorySlug}" marked as ready.`, manifest);
  } catch (err) {
    console.error('❌ markReady:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * POST /admin/pdf/mark-generating
 * Called by frontend when it starts generating a PDF — sets status to 'generating'.
 */
exports.markGenerating = async (req, res) => {
  try {
    const { categorySlug } = req.body;
    await PdfManifest.findOneAndUpdate(
      { categorySlug },
      { status: 'generating', error: null, categoryLabel: CATEGORY_LABELS[categorySlug] || categorySlug },
      { upsert: true, new: true }
    );
    sendSuccess(res, 200, 'Status updated to generating.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * POST /admin/pdf/mark-failed
 * Called by frontend if PDF generation fails.
 */
exports.markFailed = async (req, res) => {
  try {
    const { categorySlug, error } = req.body;
    await PdfManifest.findOneAndUpdate(
      { categorySlug },
      { status: 'failed', error: error || 'Unknown error' },
      { upsert: true }
    );
    sendSuccess(res, 200, 'Status updated to failed.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * GET /admin/pdf/analytics
 * Returns download analytics per category.
 */
exports.getAnalytics = async (req, res) => {
  try {
    const analytics = await PdfDownloadLog.aggregate([
      {
        $group: {
          _id: '$categorySlug',
          totalDownloads: { $sum: 1 },
          wifiDownloads:  { $sum: { $cond: [{ $eq: ['$networkType', 'wifi'] }, 1, 0] } },
          cacheHits:      { $sum: { $cond: ['$fromCache', 1, 0] } },
          lastDownload:   { $max: '$createdAt' },
          uniqueDealers:  { $addToSet: '$userId' },
        }
      },
      {
        $project: {
          category: '$_id',
          totalDownloads: 1,
          wifiDownloads: 1,
          cacheHits: 1,
          lastDownload: 1,
          uniqueDealerCount: { $size: '$uniqueDealers' },
        }
      },
      { $sort: { totalDownloads: -1 } }
    ]);

    sendSuccess(res, 200, 'PDF analytics fetched.', analytics);
  } catch (err) {
    console.error('❌ getAnalytics:', err);
    sendError(res, 500, err.message);
  }
};
