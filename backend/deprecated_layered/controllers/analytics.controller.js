const { ActivityLog } = require('../models');
const { sendSuccess, sendError } = require('../utils/sendResponse');

// Current API version — bump this whenever a breaking change is deployed
const API_VERSION = '3.0.0';

// GET /api/v1/version
// Frontend PWA calls this on load to check if cache needs clearing
exports.getVersion = (req, res) => {
  sendSuccess(res, 200, 'Version fetched.', { version: API_VERSION });
};

// GET /api/v1/analytics/summary  (Admin only)
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const now   = new Date();
    const day   = new Date(now - 24 * 60 * 60 * 1000);
    const week  = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const month = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [dailyHits, weeklyHits, monthlyHits, topPaths] = await Promise.all([
      ActivityLog.countDocuments({ createdAt: { $gte: day } }),
      ActivityLog.countDocuments({ createdAt: { $gte: week } }),
      ActivityLog.countDocuments({ createdAt: { $gte: month } }),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: week } } },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    sendSuccess(res, 200, 'Analytics summary.', {
      hits: { daily: dailyHits, weekly: weeklyHits, monthly: monthlyHits },
      topPaths,
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// POST /api/v1/analytics/log
// Collect specific high-intent events from the frontend
exports.logEvent = async (req, res) => {
  try {
    const { action, path, meta } = req.body;
    if (!action) return sendError(res, 400, 'Action is required.');

    await ActivityLog.create({
      userId: req.user?._id || null,
      action,
      path:   path || req.headers.referer,
      ip:     req.ip || req.headers['x-forwarded-for'],
      meta:   { ...meta, userAgent: req.headers['user-agent'] },
    });

    sendSuccess(res, 200, 'Event logged.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
