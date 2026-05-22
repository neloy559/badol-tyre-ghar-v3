const jwt      = require('jsonwebtoken');
const User     = require('../modules/users/user.model');
const { sendError } = require('../utils/sendResponse');

/**
 * 🛡️ Protect Middleware
 * Verifies JWT from Authorization Header (Bearer Token).
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 1. Check Authorization Header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Fallback to Cookie — BUG-043 fix: was checking btg_token but
    // issueTokens sets btg_refresh_token. This was dead code. Removed.
    // The refresh token cookie is only used by /auth/refresh endpoint directly.

    if (!token) {
      return sendError(res, 401, 'Not authenticated. Please log in.');
    }

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch User
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.isDeleted) {
      return sendError(res, 401, 'User no longer exists or session invalid.');
    }

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 401, 'Invalid or expired session. Please log in again.');
  }
};

/**
 * 🚫 Restrict to Roles
 */
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return sendError(res, 403, 'You do not have permission to perform this action.');
  }
  next();
};

/**
 * ✅ Require B2B Verification
 */
exports.requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return sendError(res, 403, 'Account pending verification. Contact Badol Tyre Ghar to activate B2B pricing.');
  }
  next();
};
