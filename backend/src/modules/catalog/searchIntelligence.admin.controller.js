const SearchLog  = require('./models/SearchLog');
const Product    = require('./models/Product');
const Category   = require('./models/Category');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

/**
 * GET /admin/search-intelligence
 * Returns all logged search terms, sorted by count desc.
 * Supports ?filter=zero (zero-result only) and ?filter=unassigned
 */
exports.getSearchLogs = async (req, res) => {
  try {
    const { filter, page = 1, limit = 50, q } = req.query;

    const match = {};

    if (filter === 'zero')       match.resultCount = 0;
    if (filter === 'unassigned') match.isAssigned  = false;
    if (filter === 'assigned')   match.isAssigned  = true;
    if (q) match.term = { $regex: q.trim(), $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      SearchLog.find(match)
        .sort({ count: -1, lastSearchedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('assignedTo.productId',  'name sku slug')
        .populate('assignedTo.categoryId', 'name slug')
        .lean(),
      SearchLog.countDocuments(match),
    ]);

    // Summary stats
    const [totalTerms, zeroResults, assigned] = await Promise.all([
      SearchLog.countDocuments({}),
      SearchLog.countDocuments({ resultCount: 0 }),
      SearchLog.countDocuments({ isAssigned: true }),
    ]);

    sendSuccess(res, 200, 'Search logs fetched.', {
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      stats: { totalTerms, zeroResults, assigned, unassigned: totalTerms - assigned },
    });
  } catch (err) {
    console.error('❌ getSearchLogs:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * POST /admin/search-intelligence/:id/assign
 * Assigns a search term as a searchTag to a product or category.
 * Body: { productId } OR { categoryId }
 */
exports.assignTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, categoryId } = req.body;

    if (!productId && !categoryId) {
      return sendError(res, 400, 'Provide either productId or categoryId.');
    }

    const log = await SearchLog.findById(id);
    if (!log) return sendError(res, 404, 'Search log not found.');

    const term = log.term;

    if (productId) {
      // Add term to product's searchTags (avoid duplicates)
      await Product.findByIdAndUpdate(productId, {
        $addToSet: { searchTags: term },
      });
      log.assignedTo.productId  = productId;
      log.assignedTo.categoryId = null;
    } else {
      // Add term to category description/tags (store on category as searchTag)
      await Category.findByIdAndUpdate(categoryId, {
        $addToSet: { searchTags: term },
      });
      log.assignedTo.categoryId = categoryId;
      log.assignedTo.productId  = null;
    }

    log.isAssigned = true;
    await log.save();

    sendSuccess(res, 200, `Tag "${term}" assigned successfully.`, log);
  } catch (err) {
    console.error('❌ assignTag:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * DELETE /admin/search-intelligence/:id
 * Removes a noise/spam search log entry.
 */
exports.deleteSearchLog = async (req, res) => {
  try {
    await SearchLog.findByIdAndDelete(req.params.id);
    sendSuccess(res, 200, 'Search log deleted.');
  } catch (err) {
    console.error('❌ deleteSearchLog:', err);
    sendError(res, 500, err.message);
  }
};

/**
 * DELETE /admin/search-intelligence/bulk-clear
 * Clears all assigned logs to keep the list clean.
 */
exports.clearAssigned = async (req, res) => {
  try {
    const result = await SearchLog.deleteMany({ isAssigned: true });
    sendSuccess(res, 200, `Cleared ${result.deletedCount} assigned logs.`);
  } catch (err) {
    console.error('❌ clearAssigned:', err);
    sendError(res, 500, err.message);
  }
};
