const { z } = require('zod');
const User = require('./user.model');
const { AuditLog } = require('../ops/models');
const { sendSuccess, sendError } = require('../../utils/sendResponse');

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const submitSchema = z.object({
  businessName: z.string().min(2).max(100),
  ownerName:    z.string().min(2).max(100),
  address:      z.string().min(5).max(300),
});

const listQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

const rejectBodySchema = z.object({
  rejectionReason: z.string().max(500).optional().default(''),
});

// ── Customer Endpoints ────────────────────────────────────────────────────────

/**
 * POST /api/v1/users/me/upgrade-request
 * Allows a customer to submit a dealer upgrade request.
 */
exports.submitUpgradeRequest = async (req, res) => {
  try {
    // 1. Validate request body
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { businessName, ownerName, address } = parsed.data;
    const user = req.user;

    // 2. Role guard — only customers may apply
    if (user.role !== 'customer') {
      return sendError(res, 403, 'Only customers can apply for a dealer upgrade.');
    }

    // 3. Conflict guards
    if (user.upgradeStatus === 'pending') {
      return sendError(res, 409, 'An upgrade request is already pending.');
    }
    if (user.upgradeStatus === 'approved') {
      return sendError(res, 409, 'Your account has already been upgraded to dealer.');
    }

    // 4. Persist upgrade details
    const dbUser = await User.findById(user._id);
    dbUser.upgradeDetails = {
      businessName,
      ownerName,
      address,
      appliedAt: new Date(),
    };
    dbUser.upgradeStatus = 'pending';
    await dbUser.save();

    sendSuccess(res, 200, 'Upgrade request submitted. Your application is under review.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * DELETE /api/v1/users/me/upgrade-request
 * Allows a customer to withdraw their pending upgrade request.
 */
exports.withdrawUpgradeRequest = async (req, res) => {
  try {
    const user = req.user;

    // Guard: must have a pending request to withdraw
    if (user.upgradeStatus !== 'pending') {
      return sendError(res, 409, 'No pending upgrade request to withdraw.');
    }

    const dbUser = await User.findById(user._id);
    dbUser.upgradeStatus = 'none';
    dbUser.upgradeDetails = {
      businessName: null,
      ownerName:    null,
      address:      null,
      appliedAt:    null,
    };
    await dbUser.save();

    sendSuccess(res, 200, 'Upgrade request withdrawn.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * GET /api/v1/users/me/upgrade-request
 * Returns the current upgrade status for the authenticated customer.
 */
exports.getUpgradeStatus = async (req, res) => {
  try {
    const dbUser = await User.findById(req.user._id)
      .select('upgradeStatus upgradeRejectionReason upgradeDetails')
      .lean();

    const upgradeDetails =
      dbUser.upgradeStatus === 'none' && !dbUser.upgradeDetails?.businessName
        ? {}
        : (dbUser.upgradeDetails ?? {});

    sendSuccess(res, 200, 'Upgrade status fetched.', {
      upgradeStatus:          dbUser.upgradeStatus,
      upgradeRejectionReason: dbUser.upgradeRejectionReason ?? null,
      upgradeDetails,
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// ── Admin Endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/upgrade-requests
 * Returns a paginated list of customers with upgrade requests.
 */
exports.listUpgradeRequests = async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { status, page, limit } = parsed.data;

    // When approved, users have already transitioned to 'dealer' role
    const roleFilter = status === 'approved' ? 'dealer' : 'customer';

    const filter = {
      role:          roleFilter,
      upgradeStatus: status,
      isDeleted:     false,
    };

    const [users, total] = await Promise.all([
      User.find(filter)
          .select('_id profile phone role upgradeStatus upgradeRejectionReason upgradeDetails createdAt')
          .sort({ 'upgradeDetails.appliedAt': -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, 200, 'Upgrade requests fetched.', { users, total, page, limit });
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * PATCH /api/v1/admin/upgrade-requests/:id/approve
 * Promotes a customer's upgrade request to dealer status.
 */
exports.approveUpgradeRequest = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) return sendError(res, 404, 'User not found.');

    if (user.upgradeStatus !== 'pending') {
      return sendError(res, 409, 'No pending upgrade request for this user.');
    }

    // Promote role and status
    user.role               = 'dealer';
    user.upgradeStatus      = 'approved';
    user.registrationStatus = 'approved';
    user.isVerified         = true;

    // Conditionally copy business details to profile
    if (!user.profile) user.profile = {};
    if (!user.profile.shopName) {
      user.profile.shopName = user.upgradeDetails?.businessName ?? '';
    }
    if (!user.profile.address) {
      user.profile.address = user.upgradeDetails?.address ?? '';
    }

    await user.save();

    // Fire-and-forget audit log
    AuditLog.create({
      adminId:  req.user._id,
      action:   'APPROVE_DEALER_UPGRADE',
      targetId: user._id,
    }).catch(() => {});

    sendSuccess(res, 200, 'Upgrade approved. User is now a dealer.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

/**
 * PATCH /api/v1/admin/upgrade-requests/:id/reject
 * Rejects a customer's upgrade request with an optional reason.
 */
exports.rejectUpgradeRequest = async (req, res) => {
  try {
    const parsed = rejectBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors);
    }

    const { rejectionReason } = parsed.data;
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) return sendError(res, 404, 'User not found.');

    if (user.upgradeStatus !== 'pending') {
      return sendError(res, 409, 'No pending upgrade request for this user.');
    }

    user.upgradeStatus            = 'rejected';
    user.upgradeRejectionReason   = rejectionReason;
    // role intentionally stays 'customer'

    await user.save();

    // Fire-and-forget audit log
    AuditLog.create({
      adminId:  req.user._id,
      action:   'REJECT_DEALER_UPGRADE',
      targetId: user._id,
      details:  { rejectionReason },
    }).catch(() => {});

    sendSuccess(res, 200, 'Upgrade request rejected.');
  } catch (err) {
    sendError(res, 500, err.message);
  }
};

// Export schemas for use in tests (controllers expose them for PBT)
exports.submitSchema    = submitSchema;
exports.listQuerySchema = listQuerySchema;
exports.rejectBodySchema = rejectBodySchema;
