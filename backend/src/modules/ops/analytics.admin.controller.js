const Product   = require('../catalog/models/Product');
const User      = require('../users/user.model');
const { AuditLog } = require('./models');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

/**
 * GET /api/v1/admin/analytics/summary
 * Returns KPIs, chart data, top products, and recent admin activity.
 * All queries run in parallel via Promise.all.
 */
exports.getSummary = async (req, res) => {
  try {
    const now      = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      totalDealers,
      activeDealers,
      productsByBrandRaw,
      dealerRegistrationsRaw,
      topViewedProducts,
      recentActivity,
    ] = await Promise.all([
      // KPI: total non-deleted products
      Product.countDocuments({ isDeleted: false }),

      // KPI: total dealers
      User.countDocuments({ role: 'dealer', isDeleted: false }),

      // KPI: active (approved) dealers
      User.countDocuments({ role: 'dealer', registrationStatus: 'approved' }),

      // Chart: products grouped by brand
      Product.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $lookup: { from: 'brands', localField: '_id', foreignField: '_id', as: 'brandDoc' } },
        { $unwind: { path: '$brandDoc', preserveNullAndEmptyArrays: true } },
        { $project: { brand: { $ifNull: ['$brandDoc.name', 'Unknown'] }, count: 1 } },
        { $sort: { count: -1 } },
      ]),

      // Chart: dealer registrations per day (last 30 days)
      User.aggregate([
        {
          $match: {
            role: 'dealer',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),

      // Table: top 5 viewed products
      Product.find({ isDeleted: false })
        .sort({ 'meta.views': -1 })
        .limit(5)
        .select('_id name slug meta.views')
        .lean(),

      // Feed: last 10 audit log entries
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('adminId', '_id profile.name')
        .lean(),
    ]);

    // Gap-fill dealerRegistrations to ensure exactly 30 entries (one per day)
    const regMap = new Map(dealerRegistrationsRaw.map(d => [d._id, d.count]));
    const dealerRegistrations = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
      dealerRegistrations.push({ date: dateStr, count: regMap.get(dateStr) ?? 0 });
    }

    // Format productsByBrand
    const productsByBrand = productsByBrandRaw.map(b => ({
      brand: b.brand,
      count: b.count,
    }));

    sendSuccess(res, 200, 'Analytics summary fetched.', {
      kpi: {
        totalProducts,
        totalDealers,
        activeDealers,
        totalOrders: 0, // placeholder — no Orders collection yet
      },
      productsByBrand,
      dealerRegistrations,
      topViewedProducts,
      recentActivity,
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
