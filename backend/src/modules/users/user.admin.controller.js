const { z } = require('zod');
const User = require('./user.model');
const { AuditLog } = require('../ops/models');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

const audit = (adminId, action, targetId, oldValue, newValue) =>
  AuditLog.create({ adminId, action, targetId, details: { oldValue, newValue } });

exports.getPendingDealers = async (req, res) => {
  try {
    const dealers = await User.find({
      role: { $in: ['dealer', 'sales_partner'] },
      registrationStatus: 'pending',
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

exports.getRegistrations = async (req, res) => {
  try {
    const querySchema = z.object({
      status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);

    const { status, page, limit } = parsed.data;
    const filter = { role: 'dealer', isDeleted: false, registrationStatus: status };
    const [dealers, total] = await Promise.all([
      User.find(filter)
          .select('_id profile phone registrationStatus rejectionReason tier verificationDetails.appliedAt createdAt')
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      User.countDocuments(filter),
    ]);
    sendSuccess(res, 200, 'Dealer registrations fetched.', { dealers, total, page, limit });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.approveDealer = async (req, res) => {
  try {
    const dealer = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    dealer.registrationStatus = 'approved';
    dealer.isVerified = true;
    await dealer.save();

    await AuditLog.create({ adminId: req.user._id, action: 'APPROVE_DEALER', targetId: dealer._id });
    sendSuccess(res, 200, 'Dealer approved.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.rejectDealer = async (req, res) => {
  try {
    const bodySchema = z.object({ rejectionReason: z.string().optional().default('') });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);

    const { rejectionReason } = parsed.data;
    const dealer = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    dealer.registrationStatus = 'rejected';
    dealer.isVerified = false;
    dealer.rejectionReason = rejectionReason;
    await dealer.save();

    await AuditLog.create({ adminId: req.user._id, action: 'REJECT_DEALER', targetId: dealer._id, details: { rejectionReason } });
    sendSuccess(res, 200, 'Dealer rejected.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

exports.setDealerTier = async (req, res) => {
  try {
    const bodySchema = z.object({ tier: z.enum(['standard', 'silver', 'gold', 'platinum']) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);

    const { tier } = parsed.data;
    const dealer = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!dealer) return sendError(res, 404, 'Dealer not found.');

    const oldTier = dealer.tier;
    dealer.tier = tier;
    await dealer.save();

    await AuditLog.create({ adminId: req.user._id, action: 'UPDATE_DEALER_TIER', targetId: dealer._id, details: { old: oldTier, new: tier } });
    sendSuccess(res, 200, 'Dealer tier updated.', { tier: dealer.tier });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};
