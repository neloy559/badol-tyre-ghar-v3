const PdfManifest    = require('./models/PdfManifest');
const PdfDownloadLog = require('./models/PdfDownloadLog');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

/**
 * GET /catalog/pdf-manifest
 * Public endpoint — returns all ready PDFs with their version hashes.
 * Dealers use this to check if their cached version is still valid.
 * Lightweight — only returns slug, url, hash, generatedAt. No product data.
 */
exports.getPdfManifest = async (req, res) => {
  try {
    const manifests = await PdfManifest.find({ status: 'ready' })
      .select('categorySlug categoryLabel pdfUrl versionHash generatedAt productCount')
      .lean();

    sendSuccess(res, 200, 'PDF manifest fetched.', manifests);
  } catch (err) {
    console.error('❌ getPdfManifest:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * POST /catalog/pdf-download-log
 * Called by frontend when a dealer downloads a PDF.
 * Logs: who, what category, when, network type, from cache or not.
 * Fire-and-forget from frontend — never blocks the download.
 */
exports.logDownload = async (req, res) => {
  try {
    const { categorySlug, versionHash, networkType, fromCache } = req.body;
    const userId    = req.user?._id || null;
    const userPhone = req.user?.phone || null;
    const ip        = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

    // Fire-and-forget: increment download count on manifest
    PdfManifest.findOneAndUpdate(
      { categorySlug },
      { $inc: { downloadCount: 1 } }
    ).exec().catch(() => {});

    // Log the download
    await PdfDownloadLog.create({
      categorySlug,
      userId,
      userPhone,
      versionHash,
      networkType: networkType || 'unknown',
      fromCache:   fromCache || false,
      ip,
    });

    sendSuccess(res, 200, 'Download logged.');
  } catch (err) {
    // Never fail the user's download because of a logging error
    console.error('❌ logDownload:', err);
    sendSuccess(res, 200, 'Logged (with error).');
  }
};
