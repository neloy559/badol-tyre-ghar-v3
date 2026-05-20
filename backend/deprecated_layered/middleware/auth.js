const jwt      = require('jsonwebtoken');
const { User } = require('../models');
const { sendError } = require('../utils/sendResponse');

// ── Verify JWT from HttpOnly Cookie ────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies?.btg_token;
    if (!token) return sendError(res, 401, 'Not authenticated. Please log in.');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.isDeleted) return sendError(res, 401, 'User no longer exists.');

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 401, 'Invalid or expired session. Please log in again.');
  }
};

// ── Restrict to Specific Roles ──────────────────────────────────
// Usage: restrictTo('admin', 'editor')
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return sendError(res, 403, 'You do not have permission to perform this action.');
  }
  next();
};

// ── Require Verified B2B Status ────────────────────────────────
exports.requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return sendError(res, 403, 'Account pending verification. Contact Badol Tyre Ghar to activate B2B pricing.');
  }
  next();
};
