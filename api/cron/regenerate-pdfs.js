/**
 * Vercel Cron Job — Nightly PDF Regeneration
 * Schedule: 9:00 PM UTC = 3:00 AM Bangladesh time (GMT+6)
 *
 * This endpoint is called automatically by Vercel's cron scheduler.
 * It marks all PDF manifests as 'pending' so the next dealer login
 * triggers a fresh generation via the frontend.
 *
 * Note: Full server-side PDF generation requires @react-pdf/renderer
 * which is a browser/Node hybrid. For Vercel Hobby plan, we use a
 * "mark stale" approach — the frontend regenerates on next access.
 */

require('dotenv').config();
const connectDB    = require('../../backend/src/config/db');
const PdfManifest  = require('../../backend/src/modules/catalog/models/PdfManifest');

const CRON_SECRET = process.env.CRON_SECRET;

const CATEGORY_LABELS = {
  'tubes':         'Tubes',
  'tyres':         'Tyres',
  'tyre-sealants': 'Tyre Sealants',
  'patches':       'Patches',
  'flaps':         'Flaps',
  'gadgets':       'Gadgets',
  'all':           'All Products',
};

module.exports = async (req, res) => {
  // Security: only allow Vercel cron calls (verified via secret header)
  const authHeader = req.headers['authorization'];
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Only allow GET (Vercel cron uses GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await connectDB();

    // Mark all manifests as 'pending' — triggers regeneration on next dealer access
    const result = await PdfManifest.updateMany(
      {},
      { $set: { status: 'pending' } }
    );

    // Ensure all categories have a manifest entry
    const existing = await PdfManifest.find({}).select('categorySlug').lean();
    const existingSlugs = existing.map(m => m.categorySlug);
    const missing = Object.keys(CATEGORY_LABELS).filter(s => !existingSlugs.includes(s));

    if (missing.length > 0) {
      await PdfManifest.insertMany(
        missing.map(slug => ({
          categorySlug: slug,
          categoryLabel: CATEGORY_LABELS[slug],
          status: 'pending',
        }))
      );
    }

    const timestamp = new Date().toISOString();
    console.log(`[BTG Cron] PDF manifests marked stale at ${timestamp}. Modified: ${result.modifiedCount}`);

    return res.status(200).json({
      success: true,
      message: `PDF manifests marked for regeneration`,
      modifiedCount: result.modifiedCount,
      timestamp,
    });
  } catch (err) {
    console.error('[BTG Cron] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
