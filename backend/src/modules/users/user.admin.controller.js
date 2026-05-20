const User = require('./user.model');
const { AuditLog } = require('../ops/models');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

const audit = (adminId, action, targetId, oldValue, newValue) =>
  AuditLog.create({ adminId, action, targetId, details: { oldValue, newValue } });

exports.getPendingDealers = async (req, res) => {
  try {
    const dealers = await User.find({
      role: { $in: ['dealer', 'sales_partner'] },
      isVerified: false,
      isDeleted: false,
      'verificationDetails.appliedAt': { $exists: true },
    }).select('-password').lean();
    sendSuccess(res, 200, 'Pending dealers fetched.', dealers);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.verifyDealer = async (req, res) => {
  try {
    const { approve } = req.body;
    const dealer = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const oldVerified = dealer.isVerified;
    dealer.isVerified = !!approve;
    await dealer.save();

    await audit(req.user._id, approve ? 'VERIFY_DEALER' : 'REJECT_DEALER', dealer._id, oldVerified, dealer.isVerified);
    sendSuccess(res, 200, `Dealer ${approve ? 'approved' : 'rejected'}.`);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.setDealerDiscount = async (req, res) => {
  try {
    const { multiplier, creditLimit, paymentTerms } = req.body;
    const dealer = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const old = { multiplier: dealer.discountMultiplier, creditLimit: dealer.creditLimit };
    if (multiplier    !== undefined) dealer.discountMultiplier = multiplier;
    if (creditLimit   !== undefined) dealer.creditLimit        = creditLimit;
    if (paymentTerms  !== undefined) dealer.paymentTerms       = paymentTerms;
    await dealer.save();

    await audit(req.user._id, 'UPDATE_DEALER_TERMS', dealer._id, old, { multiplier, creditLimit, paymentTerms });
    sendSuccess(res, 200, 'Dealer terms updated.', dealer);
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
