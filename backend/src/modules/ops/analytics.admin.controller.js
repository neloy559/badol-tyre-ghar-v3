const { ActivityLog } = require('./models');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

/**
 * GET /api/v1/admin/analytics/summary
 * Returns API hit counts (daily, weekly, monthly) and top endpoint paths.
 * Powers the DashboardHome overview page.
 */
exports.getSummary = async (req, res) => {
  try {
    const now   = new Date();
    const dayAgo   = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo  = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Run all counts in parallel
    const [daily, weekly, monthly, topPaths] = await Promise.all([
      ActivityLog.countDocuments({ createdAt: { $gte: dayAgo } }),
      ActivityLog.countDocuments({ createdAt: { $gte: weekAgo } }),
      ActivityLog.countDocuments({ createdAt: { $gte: monthAgo } }),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    sendSuccess(res, 200, 'Analytics summary fetched.', {
      hits: { daily, weekly, monthly },
      topPaths,
    });
  } catch (err) {
    console.error('❌ Analytics summary error:', err);
    sendError(res, 500, err.message);
  }
};
