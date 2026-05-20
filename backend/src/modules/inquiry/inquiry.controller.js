const Inquiry = require('./models/Inquiry');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

/**
 * 📝 Create New Inquiry
 */
exports.createInquiry = async (req, res) => {
  try {
    const { items, totalAmount } = req.body;

    const newInquiry = await Inquiry.create({
      userId:      req.user?._id || null,
      items,
      totalAmount,
      meta: {
        ip:        req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    sendSuccess(res, 201, 'Inquiry logged successfully.', newInquiry);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * 📜 Get My Inquiries
 */
exports.getMyInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ userId: req.user._id })
      .populate('items.product', 'name media slug')
      .sort({ createdAt: -1 });

    sendSuccess(res, 200, 'My inquiries fetched.', inquiries);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
