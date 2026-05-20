const InquiryCart = require('./inquiry.model');
const { AuditLog } = require('../ops/models');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

const audit = (adminId, action, targetId, oldValue, newValue) =>
  AuditLog.create({ adminId, action, targetId, details: { oldValue, newValue } });

exports.getInquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const inquiries = await InquiryCart.find(filter)
      .populate('userId', 'phone profile.name profile.shopName role')
      .populate('items.productId', 'name sku')
      .sort({ updatedAt: -1 })
      .lean();
    sendSuccess(res, 200, 'Inquiries fetched.', inquiries);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status, saleAmount } = req.body;
    const validStatuses = ['inquired', 'replied', 'converted_to_sale', 'closed'];
    if (!validStatuses.includes(status)) return sendError(res, 400, 'Invalid status.');

    const cart = await InquiryCart.findById(req.params.id);
    if (!cart) return sendError(res, 404, 'Inquiry not found.');

    const old = cart.status;
    cart.status = status;
    if (status === 'converted_to_sale' && saleAmount) {
      cart.saleDetails = { amount: saleAmount, date: new Date() };
    }
    await cart.save();

    await audit(req.user._id, 'UPDATE_INQUIRY_STATUS', cart._id, old, status);
    sendSuccess(res, 200, 'Inquiry status updated.', cart);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
